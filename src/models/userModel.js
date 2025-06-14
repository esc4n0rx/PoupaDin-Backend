// src/models/userModel.js
const supabase = require('../config/supabaseClient');
const crypto = require('crypto');

// Funções relacionadas ao usuário
const findByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const create = async (userData) => {
    const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
    
    if (error) {
        throw error;
    }
    return data;
};

const updatePassword = async (userId, newPasswordHash) => {
    const { data, error } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        throw error;
    }
    return data;
};

// Funções relacionadas à redefinição de senha com código de 6 dígitos
const createPasswordResetCode = async (userId) => {
    // Gerar código de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Código expira em 15 minutos

    // Deletar códigos anteriores do usuário (cleanup)
    await supabase
        .from('password_resets')
        .delete()
        .eq('user_id', userId);

    const { error } = await supabase
        .from('password_resets')
        .insert({
            user_id: userId,
            reset_code: resetCode,
            expires_at: expiresAt.toISOString(),
            used: false
        });

    if (error) {
        throw error;
    }
    
    return resetCode;
};

const findValidResetCode = async (resetCode) => {
    const { data, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('reset_code', resetCode)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const markResetCodeAsUsed = async (resetId) => {
    const { error } = await supabase
        .from('password_resets')
        .update({ 
            used: true,
            used_at: new Date().toISOString()
        })
        .eq('id', resetId);
    
    if (error) {
        throw error;
    }
};

const deleteExpiredResetCodes = async () => {
    const { error } = await supabase
        .from('password_resets')
        .delete()
        .lt('expires_at', new Date().toISOString());
    
    if (error) {
        throw error;
    }
};

module.exports = {
    findByEmail,
    create,
    updatePassword,
    createPasswordResetCode,
    findValidResetCode,
    markResetCodeAsUsed,
    deleteExpiredResetCodes
};