const supabase = require('../config/supabaseClient');

// ==================== GOAL OPERATIONS ====================

const createGoal = async (goalData) => {
    // Validar data alvo se fornecida
    if (goalData.target_date) {
        const targetDate = new Date(goalData.target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (targetDate <= today) {
            throw new Error('A data alvo deve ser futura.');
        }
    }
    
    const { data, error } = await supabase
        .from('goals')
        .insert([goalData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getGoalsByUserId = async (userId, includeInactive = false) => {
    let query = supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (!includeInactive) {
        query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
};

const getGoalById = async (goalId) => {
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const updateGoal = async (goalId, updateData) => {
    // Validar data alvo se fornecida
    if (updateData.target_date) {
        const targetDate = new Date(updateData.target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (targetDate <= today) {
            throw new Error('A data alvo deve ser futura.');
        }
    }
    
    const { data, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const deleteGoal = async (goalId) => {
    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);
    
    if (error) throw error;
};

const updateGoalAmount = async (goalId, newAmount) => {
    const { data, error } = await supabase
        .from('goals')
        .update({ 
            current_amount: newAmount,
            updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const markGoalAsCompleted = async (goalId) => {
    const { data, error } = await supabase
        .from('goals')
        .update({ 
            is_completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ==================== GOAL TRANSACTION OPERATIONS ====================

const createGoalTransaction = async (transactionData) => {
    const { data, error } = await supabase
        .from('goal_transactions')
        .insert([transactionData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getGoalTransactions = async (goalId, limit = 50) => {
    const { data, error } = await supabase
        .from('goal_transactions')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
};

const getGoalTransactionsByUserId = async (userId, limit = 100) => {
    const { data, error } = await supabase
        .from('goal_transactions')
        .select(`
            *,
            goals!goal_transactions_goal_id_fkey(name, color)
        `)
        .eq('goals.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
};

// ==================== STATISTICS ====================

const getGoalStatistics = async (userId) => {
    const { data, error } = await supabase
        .from('goals')
        .select('current_amount, target_amount, is_completed')
        .eq('user_id', userId)
        .eq('is_active', true);

    if (error) throw error;
    
    const stats = {
        total_goals: data.length,
        completed_goals: data.filter(g => g.is_completed).length,
        total_saved: data.reduce((sum, g) => sum + parseFloat(g.current_amount), 0),
        total_target: data.reduce((sum, g) => sum + parseFloat(g.target_amount), 0)
    };
    
    stats.overall_progress = stats.total_target > 0 
        ? (stats.total_saved / stats.total_target * 100).toFixed(2)
        : 0;
    
    return stats;
};

module.exports = {
    createGoal,
    getGoalsByUserId,
    getGoalById,
    updateGoal,
    deleteGoal,
    updateGoalAmount,
    markGoalAsCompleted,
    createGoalTransaction,
    getGoalTransactions,
    getGoalTransactionsByUserId,
    getGoalStatistics
};