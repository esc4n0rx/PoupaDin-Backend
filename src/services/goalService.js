const goalModel = require('../models/goalModel');
const NotificationService = require('./notificationService');

class GoalService {
    
    // Calcular progresso e estatísticas do objetivo
    static calculateGoalProgress(goal) {
        const currentAmount = parseFloat(goal.current_amount);
        const targetAmount = parseFloat(goal.target_amount);
        const monthlyTarget = parseFloat(goal.monthly_target || 0);
        
        const progress = targetAmount > 0 ? (currentAmount / targetAmount * 100) : 0;
        const remainingAmount = Math.max(0, targetAmount - currentAmount);
        
        let estimatedCompletion = null;
        let monthsToComplete = null;
        
        if (monthlyTarget > 0 && remainingAmount > 0) {
            monthsToComplete = Math.ceil(remainingAmount / monthlyTarget);
            
            const today = new Date();
            const estimatedDate = new Date(today);
            estimatedDate.setMonth(estimatedDate.getMonth() + monthsToComplete);
            estimatedCompletion = estimatedDate.toISOString().split('T')[0];
        }
        
        // Verificar se está atrasado (se tem data alvo)
        let isOverdue = false;
        let daysOverdue = 0;
        
        if (goal.target_date && !goal.is_completed) {
            const targetDate = new Date(goal.target_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (today > targetDate) {
                isOverdue = true;
                daysOverdue = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
            }
        }
        
        return {
            ...goal,
            progress: parseFloat(progress.toFixed(2)),
            remaining_amount: remainingAmount,
            months_to_complete: monthsToComplete,
            estimated_completion: estimatedCompletion,
            is_overdue: isOverdue,
            days_overdue: daysOverdue
        };
    }
    
    // Criar objetivo
    static async createGoal(userId, goalData) {
        // Verificar se o usuário não excede limite de objetivos ativos (opcional)
        const activeGoals = await goalModel.getGoalsByUserId(userId, false);
        if (activeGoals.length >= 20) { // Limite de 20 objetivos ativos
            throw new Error('Você atingiu o limite máximo de 20 objetivos ativos.');
        }
        
        const goalDataWithUser = {
            ...goalData,
            user_id: userId
        };
        
        const goal = await goalModel.createGoal(goalDataWithUser);
        return this.calculateGoalProgress(goal);
    }
    
    // Processar transação (depósito ou saque)
    static async processGoalTransaction(userId, transactionData) {
        const { goal_id, transaction_type, amount, description } = transactionData;
        
        // Verificar se objetivo existe e pertence ao usuário
        const goal = await goalModel.getGoalById(goal_id);
        if (!goal) {
            throw new Error('Objetivo não encontrado.');
        }
        
        if (goal.user_id !== userId) {
            throw new Error('Você não tem permissão para acessar este objetivo.');
        }
        
        if (!goal.is_active) {
            throw new Error('Não é possível fazer transações em objetivos inativos.');
        }
        
        if (goal.is_completed && transaction_type === 'deposit') {
            throw new Error('Objetivo já foi concluído.');
        }
        
        const currentAmount = parseFloat(goal.current_amount);
        let newAmount;
        
        if (transaction_type === 'deposit') {
            newAmount = currentAmount + amount;
            
            // Verificar se não excede o alvo
            if (newAmount > parseFloat(goal.target_amount)) {
                throw new Error('O depósito faria o valor exceder a meta do objetivo.');
            }
        } else { // withdrawal
            newAmount = currentAmount - amount;
            
            // Verificar se há saldo suficiente
            if (newAmount < 0) {
                throw new Error('Saldo insuficiente no objetivo.');
            }
        }
        
        // Registrar transação
        await goalModel.createGoalTransaction({
            goal_id: goal_id,
            transaction_type: transaction_type,
            amount: amount,
            description: description || `${transaction_type === 'deposit' ? 'Depósito' : 'Saque'} no objetivo`,
            balance_before: currentAmount,
            balance_after: newAmount
        });
        
        // Atualizar valor do objetivo
        const updatedGoal = await goalModel.updateGoalAmount(goal_id, newAmount);


         // NOVA FUNCIONALIDADE: Verificar marcos e completude
        if (transaction_type === 'deposit') {
            const targetAmount = parseFloat(goal.target_amount);
            const progressPercentage = (newAmount / targetAmount) * 100;
            
            // Verificar marcos importantes (25%, 50%, 75%)
            const oldProgressPercentage = (currentAmount / targetAmount) * 100;
            
            const milestones = [25, 50, 75];
            for (const milestone of milestones) {
                if (oldProgressPercentage < milestone && progressPercentage >= milestone) {
                    await NotificationService.sendGoalMilestone(userId, {
                        ...goal,
                        current_amount: newAmount
                    }, progressPercentage);
                    break; // Enviar apenas um marco por transação
                }
            }
            
            // Verificar se objetivo foi completado
            if (newAmount >= targetAmount && !goal.is_completed) {
                await goalModel.markGoalAsCompleted(goal_id);
                updatedGoal.is_completed = true;
                updatedGoal.completed_at = new Date().toISOString();
                
                await NotificationService.sendGoalCompleted(userId, {
                    ...goal,
                    current_amount: newAmount
                });
            }
        }
        
        return {
            success: true,
            new_amount: newAmount,
            goal: this.calculateGoalProgress(updatedGoal),
            completed: newAmount >= parseFloat(goal.target_amount)
        };
    }
    
    // Obter objetivos com progresso calculado
    static async getUserGoalsWithProgress(userId, includeInactive = false) {
        const goals = await goalModel.getGoalsByUserId(userId, includeInactive);
        return goals.map(goal => this.calculateGoalProgress(goal));
    }
    
    // Obter objetivo específico com progresso
    static async getGoalWithProgress(userId, goalId) {
        const goal = await goalModel.getGoalById(goalId);
        
        if (!goal) {
            throw new Error('Objetivo não encontrado.');
        }
        
        if (goal.user_id !== userId) {
            throw new Error('Você não tem permissão para acessar este objetivo.');
        }
        
        return this.calculateGoalProgress(goal);
    }
    
    // Atualizar objetivo
    static async updateGoal(userId, goalId, updateData) {
        const goal = await goalModel.getGoalById(goalId);
        
        if (!goal) {
            throw new Error('Objetivo não encontrado.');
        }
        
        if (goal.user_id !== userId) {
            throw new Error('Você não tem permissão para editar este objetivo.');
        }
        
        if (goal.is_completed) {
            throw new Error('Não é possível editar objetivos já concluídos.');
        }
        
        // Validar se novo target_amount não é menor que current_amount
        if (updateData.target_amount && updateData.target_amount < parseFloat(goal.current_amount)) {
            throw new Error('O valor alvo não pode ser menor que o valor já economizado.');
        }
        
        const updatedGoal = await goalModel.updateGoal(goalId, updateData);
        return this.calculateGoalProgress(updatedGoal);
    }
    
    // Deletar objetivo
    static async deleteGoal(userId, goalId) {
        const goal = await goalModel.getGoalById(goalId);
        
        if (!goal) {
            throw new Error('Objetivo não encontrado.');
        }
        
        if (goal.user_id !== userId) {
            throw new Error('Você não tem permissão para deletar este objetivo.');
        }
        
        // Verificar se tem saldo (só pode deletar se não tiver dinheiro)
        if (parseFloat(goal.current_amount) > 0) {
            throw new Error('Não é possível deletar objetivos com saldo. Retire o dinheiro antes de deletar.');
        }
        
        await goalModel.deleteGoal(goalId);
        return { success: true };
    }
    
    // Marcar objetivo como completo manualmente
    static async completeGoal(userId, goalId) {
        const goal = await goalModel.getGoalById(goalId);
        
        if (!goal) {
            throw new Error('Objetivo não encontrado.');
        }
        
        if (goal.user_id !== userId) {
            throw new Error('Você não tem permissão para modificar este objetivo.');
        }
        
        if (goal.is_completed) {
            throw new Error('Objetivo já foi concluído.');
        }
        
        if (parseFloat(goal.current_amount) < parseFloat(goal.target_amount)) {
            throw new Error('Só é possível marcar como completo objetivos que atingiram a meta.');
        }
        
        const updatedGoal = await goalModel.markGoalAsCompleted(goalId);
        return this.calculateGoalProgress(updatedGoal);
    }
    
    // Obter relatório financeiro dos objetivos
    static async getGoalsReport(userId) {
        const [goals, stats, recentTransactions] = await Promise.all([
            goalModel.getGoalsByUserId(userId, true), // Incluir inativos
            goalModel.getGoalStatistics(userId),
            goalModel.getGoalTransactionsByUserId(userId, 10)
        ]);
        
        const goalsWithProgress = goals.map(goal => this.calculateGoalProgress(goal));
        
        // Agrupar por status
        const activeGoals = goalsWithProgress.filter(g => g.is_active && !g.is_completed);
        const completedGoals = goalsWithProgress.filter(g => g.is_completed);
        const overdueGoals = activeGoals.filter(g => g.is_overdue);
        
        return {
            statistics: stats,
            goals_by_status: {
                active: activeGoals,
                completed: completedGoals,
                overdue: overdueGoals
            },
            recent_transactions: recentTransactions,
            summary: {
                total_goals: goals.length,
                active_goals: activeGoals.length,
                completed_goals: completedGoals.length,
                overdue_goals: overdueGoals.length
            }
        };
    }
}

module.exports = GoalService;