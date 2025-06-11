const budgetModel = require('../models/budgetModel');

class BudgetService {
    
    // Calcular totais do orçamento
    static calculateBudgetTotals(incomes, categories = []) {
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
        const allocatedAmount = categories.reduce((sum, category) => sum + category.allocated_amount, 0);
        const availableBalance = totalIncome - allocatedAmount;
        
        return {
            totalIncome,
            allocatedAmount,
            availableBalance
        };
    }

    // Validar se o orçamento está consistente
    static validateBudgetConsistency(incomes, categories) {
        const { totalIncome, allocatedAmount } = this.calculateBudgetTotals(incomes, categories);
        
        if (allocatedAmount > totalIncome) {
            throw new Error('O valor total alocado não pode ser maior que a renda total.');
        }
        
        return true;
    }

    // Criar orçamento completo
    static async createCompleteBudget(userId, budgetData) {
        const { name = 'Meu Orçamento', incomes, categories = [] } = budgetData;
        
        // Validar consistência
        this.validateBudgetConsistency(incomes, categories);
        
        // Calcular totais
        const { totalIncome, allocatedAmount, availableBalance } = this.calculateBudgetTotals(incomes, categories);
        
        // Criar orçamento
        const budget = await budgetModel.createBudget({
            user_id: userId,
            name,
            total_income: totalIncome,
            allocated_amount: allocatedAmount,
            available_balance: availableBalance
        });
        
        // Criar rendas
        const incomesWithBudgetId = incomes.map(income => ({
            ...income,
            budget_id: budget.id
        }));
        await budgetModel.createIncomes(incomesWithBudgetId);
        
        // Criar categorias se existirem
        if (categories.length > 0) {
            const categoriesWithBudgetId = categories.map(category => ({
                ...category,
                budget_id: budget.id,
                current_balance: category.allocated_amount, // Saldo inicial igual ao alocado
                color: category.color || '#3B82F6'
            }));
            await budgetModel.createBudgetCategories(categoriesWithBudgetId);
        }
        
        // Marcar setup como completo
        await budgetModel.markUserSetupCompleted(userId);
        
        return budget;
    }

    // Processar despesa em categoria
    static async processExpense(userId, expenseData) {
        const { category_id, amount, description } = expenseData;
        
        // Verificar se categoria existe e pertence ao usuário
        const category = await budgetModel.getCategoryById(category_id);
        if (!category) {
            throw new Error('Categoria não encontrada.');
        }
        
        // Verificar se o usuário tem acesso a esta categoria
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || budget.id !== category.budget_id) {
            throw new Error('Você não tem permissão para acessar esta categoria.');
        }
        
        // Verificar se há saldo suficiente
        if (category.current_balance < amount) {
            throw new Error('Saldo insuficiente na categoria.');
        }
        
        // Atualizar saldo da categoria
        const newBalance = category.current_balance - amount;
        await budgetModel.updateCategoryBalance(category_id, newBalance);
        
        // Registrar transação
        await budgetModel.createBudgetTransaction({
            budget_id: budget.id,
            category_id: category_id,
            transaction_type: 'expense',
            amount: amount,
            description: description
        });
        
        return { success: true, new_balance: newBalance };
    }

    // Processar transferência entre categorias
    static async processTransfer(userId, transferData) {
        const { from_category_id, to_category_id, amount, description } = transferData;
        
        if (from_category_id === to_category_id) {
            throw new Error('As categorias de origem e destino devem ser diferentes.');
        }
        
        // Verificar categorias
        const [fromCategory, toCategory] = await Promise.all([
            budgetModel.getCategoryById(from_category_id),
            budgetModel.getCategoryById(to_category_id)
        ]);
        
        if (!fromCategory || !toCategory) {
            throw new Error('Uma ou ambas as categorias não foram encontradas.');
        }
        
        // Verificar se o usuário tem acesso
        const budget = await budgetModel.findActiveBudgetByUserId(userId);
        if (!budget || 
            budget.id !== fromCategory.budget_id || 
            budget.id !== toCategory.budget_id) {
            throw new Error('Você não tem permissão para acessar estas categorias.');
        }
        
        // Verificar saldo suficiente na categoria de origem
        if (fromCategory.current_balance < amount) {
            throw new Error('Saldo insuficiente na categoria de origem.');
        }
        
        // Verificar se a categoria de destino não vai exceder o limite
        const newToBalance = toCategory.current_balance + amount;
        if (newToBalance > toCategory.allocated_amount) {
            throw new Error('A transferência faria a categoria de destino exceder seu limite alocado.');
        }
        
        // Processar transferência
        const newFromBalance = fromCategory.current_balance - amount;
        
        await Promise.all([
            budgetModel.updateCategoryBalance(from_category_id, newFromBalance),
            budgetModel.updateCategoryBalance(to_category_id, newToBalance)
        ]);
        
        // Registrar transações
        await Promise.all([
            budgetModel.createBudgetTransaction({
                budget_id: budget.id,
                from_category_id: from_category_id,
                to_category_id: to_category_id,
                transaction_type: 'transfer_out',
                amount: amount,
                description: description
            }),
            budgetModel.createBudgetTransaction({
                budget_id: budget.id,
                from_category_id: from_category_id,
                to_category_id: to_category_id,
                transaction_type: 'transfer_in',
                amount: amount,
                description: description
            })
        ]);
        
        return { 
            success: true, 
            from_new_balance: newFromBalance,
            to_new_balance: newToBalance
        };
    }
}

module.exports = BudgetService;