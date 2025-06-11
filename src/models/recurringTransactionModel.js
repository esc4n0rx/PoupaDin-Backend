const supabase = require('../config/supabaseClient');

// ==================== RECURRING TRANSACTION OPERATIONS ====================

const createRecurringTransaction = async (transactionData) => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .insert([transactionData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getRecurringTransactionsByBudgetId = async (budgetId) => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
            *,
            budget_categories!recurring_transactions_category_id_fkey(name, color)
        `)
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

const getRecurringTransactionById = async (transactionId) => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const updateRecurringTransaction = async (transactionId, updateData) => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const deleteRecurringTransaction = async (transactionId) => {
    const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', transactionId);
    
    if (error) throw error;
};

// ==================== EXECUTION OPERATIONS ====================

const getActiveRecurringTransactions = async () => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
            *,
            budget_categories!recurring_transactions_category_id_fkey(
                id, name, current_balance, budget_id
            )
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .or('end_date.is.null');

    if (error) throw error;
    return data;
};

const updateLastExecution = async (transactionId, executionDate) => {
    const { data, error } = await supabase
        .from('recurring_transactions')
        .update({ 
            last_executed_at: executionDate,
            updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ==================== EXECUTION LOG OPERATIONS ====================

const createExecutionLog = async (logData) => {
    const { data, error } = await supabase
        .from('recurring_transaction_logs')
        .insert([logData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getExecutionLogs = async (transactionId, limit = 50) => {
    const { data, error } = await supabase
        .from('recurring_transaction_logs')
        .select('*')
        .eq('recurring_transaction_id', transactionId)
        .order('executed_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
};

module.exports = {
    createRecurringTransaction,
    getRecurringTransactionsByBudgetId,
    getRecurringTransactionById,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    getActiveRecurringTransactions,
    updateLastExecution,
    createExecutionLog,
    getExecutionLogs
};