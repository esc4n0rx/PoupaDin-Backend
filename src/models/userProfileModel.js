const supabase = require('../config/supabaseClient');

/**
 * Model para gerenciar perfis de usuário
 */
class UserProfileModel {
    
    // Criar perfil básico para novo usuário
    static async createDefaultProfile(userId, userData) {
        try {
            const defaultProfile = {
                user_id: userId,
                name: userData.name,
                bio: '',
                location: '',
                website: '',
                phone: '',
                avatar_url: null,
                avatar_path: null,
                privacy_settings: {
                    profile_visible: true,
                    email_visible: false,
                    phone_visible: false
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('user_profiles')
                .insert([defaultProfile])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar perfil padrão:', error);
            throw error;
        }
    }
    
    // Buscar perfil por ID do usuário
    static async findByUserId(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select(`
                    *,
                    users!user_profiles_user_id_fkey(
                        id, email, created_at, initial_setup_completed
                    )
                `)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            throw error;
        }
    }
    
    // Atualizar perfil
    static async updateProfile(userId, updateData) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }
    
    // Atualizar avatar
    static async updateAvatar(userId, avatarUrl, avatarPath) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    avatar_url: avatarUrl,
                    avatar_path: avatarPath,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar avatar:', error);
            throw error;
        }
    }
    
    // Remover avatar
    static async removeAvatar(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    avatar_url: null,
                    avatar_path: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao remover avatar:', error);
            throw error;
        }
    }
    
    // Verificar se perfil existe
    static async profileExists(userId) {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('user_id')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            return !!data;
        } catch (error) {
            console.error('Erro ao verificar existência do perfil:', error);
            return false;
        }
    }
    
    // Buscar perfis públicos (para busca/descoberta)
    static async findPublicProfiles(limit = 20, offset = 0, searchTerm = '') {
        try {
            let query = supabase
                .from('user_profiles')
                .select(`
                    user_id, name, bio, location, avatar_url,
                    users!user_profiles_user_id_fkey(email)
                `)
                .eq('privacy_settings->profile_visible', true)
                .range(offset, offset + limit - 1);

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query.order('updated_at', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar perfis públicos:', error);
            throw error;
        }
    }
}

module.exports = UserProfileModel;