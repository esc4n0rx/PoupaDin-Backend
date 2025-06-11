const supabase = require('../config/supabaseClient');

// ==================== BUDGET OPERATIONS ====================

const findActiveBudgetByUserId = async (userId) => {
    const { data, error } = await supabase
        .from('budgets')
        .select(`
            *,
            incomes(*),
            budget_categories(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const createBudget = async (budgetData) => {
    const { data, error } = await supabase
        .from('budgets')
        .insert([budgetData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const updateBudget = async (budgetId, updateData) => {
    const { data, error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', budgetId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ==================== INCOME OPERATIONS ====================

const createIncomes = async (incomes) => {
    const { data, error } = await supabase
        .from('incomes')
        .insert(incomes)
        .select();
    
    if (error) throw error;
    return data;
};

const getIncomesByBudgetId = async (budgetId) => {
    const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .order('receive_day');

    if (error) throw error;
    return data;
};

// ==================== CATEGORY OPERATIONS ====================

const createBudgetCategories = async (categories) => {
    const { data, error } = await supabase
        .from('budget_categories')
        .insert(categories)
        .select();
    
    if (error) throw error;
    return data;
};

const getCategoriesByBudgetId = async (budgetId) => {
    const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data;
};

const updateCategoryBalance = async (categoryId, newBalance) => {
    const { data, error } = await supabase
        .from('budget_categories')
        .update({ 
            current_balance: newBalance,
            updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const getCategoryById = async (categoryId) => {
    const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

// ==================== TRANSACTION OPERATIONS ====================

const createBudgetTransaction = async (transactionData) => {
    const { data, error } = await supabase
        .from('budget_transactions')
        .insert([transactionData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getTransactionsByBudgetId = async (budgetId, limit = 50) => {
    const { data, error } = await supabase
        .from('budget_transactions')
        .select(`
            *,
            budget_categories!budget_transactions_category_id_fkey(name),
            from_category:budget_categories!budget_transactions_from_category_id_fkey(name),
            to_category:budget_categories!budget_transactions_to_category_id_fkey(name)
        `)
        .eq('budget_id', budgetId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
};

// ==================== USER SETUP OPERATIONS ====================

const markUserSetupCompleted = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .update({ initial_setup_completed: true })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const checkUserSetupStatus = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('initial_setup_completed')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data?.initial_setup_completed || false;
};

module.exports = {
    findActiveBudgetByUserId,
    createBudget,
    updateBudget,
    createIncomes,
    getIncomesByBudgetId,
    createBudgetCategories,
    getCategoriesByBudgetId,
    updateCategoryBalance,
    getCategoryById,
    createBudgetTransaction,
    getTransactionsByBudgetId,
    markUserSetupCompleted,
    checkUserSetupStatus
};