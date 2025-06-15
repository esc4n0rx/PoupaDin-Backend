const supabase = require('../config/supabaseClient');

// ==================== NOTIFICATION TEMPLATES ====================

const createTemplate = async (templateData) => {
    const { data, error } = await supabase
        .from('notification_templates')
        .insert([templateData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getTemplateByType = async (type) => {
    const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const getAllTemplates = async () => {
    const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('type');

    if (error) throw error;
    return data;
};

// ==================== NOTIFICATIONS ====================

const createNotification = async (notificationData) => {
    const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getNotificationsByUserId = async (userId, limit = 50, offset = 0, unreadOnly = false) => {
    let query = supabase
        .from('notifications')
        .select(`
            *,
            notification_templates(type, icon, color)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (unreadOnly) {
        query = query.is('read_at', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

const markNotificationAsRead = async (notificationId, userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .update({ 
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const markAllNotificationsAsRead = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .update({ 
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .is('read_at', null)
        .select();

    if (error) throw error;
    return data;
};

const updateNotificationStatus = async (notificationId, status, additionalData = {}) => {
    const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
    };

    const { data, error } = await supabase
        .from('notifications')
        .update(updateData)
        .eq('id', notificationId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

const getPendingNotifications = async (limit = 100) => {
    const { data, error } = await supabase
        .from('notifications')
        .select(`
            *,
            users!notifications_user_id_fkey(id, name, email),
            notification_templates(*)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(limit)
        .order('scheduled_for');

    if (error) throw error;
    return data;
};

const getNotificationStats = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('status, read_at')
        .eq('user_id', userId);

    if (error) throw error;
    
    const stats = {
        total: data.length,
        unread: data.filter(n => !n.read_at).length,
        sent: data.filter(n => n.status === 'sent').length,
        failed: data.filter(n => n.status === 'failed').length
    };

    return stats;
};

// ==================== USER SETTINGS ====================

const getUserNotificationSettings = async (userId) => {
    const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const createDefaultUserSettings = async (userId) => {
    const { data, error } = await supabase
        .from('user_notification_settings')
        .insert([{ user_id: userId }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const updateUserNotificationSettings = async (userId, settings) => {
    const { data, error } = await supabase
        .from('user_notification_settings')
        .update({
            ...settings,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// ==================== FCM TOKENS ====================

const saveFCMToken = async (userId, tokenData) => {
    const { data, error } = await supabase
        .from('user_fcm_tokens')
        .upsert([{
            user_id: userId,
            ...tokenData,
            last_used_at: new Date().toISOString()
        }], {
            onConflict: 'user_id,fcm_token'
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

const getUserFCMTokens = async (userId) => {
    const { data, error } = await supabase
        .from('user_fcm_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

    if (error) throw error;
    return data;
};

const deactivateFCMToken = async (token) => {
    const { data, error } = await supabase
        .from('user_fcm_tokens')
        .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
        })
        .eq('fcm_token', token);

    if (error) throw error;
    return data;
};

// ==================== DELIVERY LOGS ====================

const createDeliveryLog = async (logData) => {
    const { data, error } = await supabase
        .from('notification_delivery_logs')
        .insert([logData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

module.exports = {
    // Templates
    createTemplate,
    getTemplateByType,
    getAllTemplates,
    
    // Notifications
    createNotification,
    getNotificationsByUserId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotificationStatus,
    getPendingNotifications,
    getNotificationStats,
    
    // User Settings
    getUserNotificationSettings,
    createDefaultUserSettings,
    updateUserNotificationSettings,
    
    // FCM Tokens
    saveFCMToken,
    getUserFCMTokens,
    deactivateFCMToken,
    
    // Delivery Logs
    createDeliveryLog
};