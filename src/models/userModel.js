 
const supabase = require('../config/supabaseClient');
const crypto = require('crypto');

// Funcoes relacionadas ao usuario
const findByEmail = async (email) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single(); // .single() retorna um unico objeto em vez de um array

    if (error && error.code !== 'PGRST116') { // PGRST116: 'No rows found'
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

// Funcoes relacionadas a redefinicao de senha
const createPasswordResetToken = async (userId) => {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expira em 1 hora

    const { error } = await supabase
        .from('password_resets')
        .insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString()
        });

    if (error) {
        throw error;
    }
    
    // Retornamos o token original (nao hasheado) para ser enviado por email
    return resetToken; 
};

const findResetToken = async (tokenHash) => {
    const { data, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

const deleteResetToken = async (tokenId) => {
    const { error } = await supabase
        .from('password_resets')
        .delete()
        .eq('id', tokenId);
    
    if (error) {
        throw error;
    }
};

module.exports = {
    findByEmail,
    create,
    updatePassword,
    createPasswordResetToken,
    findResetToken,
    deleteResetToken
};