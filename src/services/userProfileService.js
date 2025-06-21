const UserProfileModel = require('../models/userProfileModel');
const StorageUtils = require('../utils/storageUtils');
const NotificationService = require('./notificationService');

/**
 * Service para lógica de negócio do perfil de usuário
 */
class UserProfileService {
    
    // Obter perfil completo do usuário
    static async getUserProfile(userId) {
        try {
            const profile = await UserProfileModel.findByUserId(userId);
            
            if (!profile) {
                throw new Error('Perfil não encontrado');
            }
            
            // Adicionar URLs de avatar com diferentes tamanhos usando Cloudinary
            if (profile.avatar_path) {
                profile.avatar_urls = StorageUtils.getAvatarUrls(profile.avatar_path);
            }
            
            return profile;
        } catch (error) {
            console.error('Erro ao obter perfil:', error);
            throw error;
        }
    }
    
    // Atualizar perfil
    static async updateProfile(userId, updateData) {
        try {
            // Verificar se perfil existe
            const existingProfile = await UserProfileModel.findByUserId(userId);
            if (!existingProfile) {
                throw new Error('Perfil não encontrado');
            }
            
            // Atualizar perfil
            const updatedProfile = await UserProfileModel.updateProfile(userId, updateData);
            
            // Notificar sobre atualização de perfil (opcional)
            if (updateData.name || updateData.bio) {
                await NotificationService.createNotificationFromTemplate(
                    userId,
                    'profile_updated',
                    {
                        changes: Object.keys(updateData).join(', ')
                    },
                    {
                        priority: NotificationService.PRIORITIES.LOW
                    }
                ).catch(err => console.log('Erro ao enviar notificação de perfil:', err));
            }
            
            return await this.getUserProfile(userId);
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }
    
    // Upload de avatar
    static async uploadAvatar(userId, file) {
        try {
            // Obter perfil atual para possível remoção do avatar antigo
            const currentProfile = await UserProfileModel.findByUserId(userId);
            if (!currentProfile) {
                throw new Error('Perfil não encontrado');
            }
            
            // Upload do novo avatar para Cloudinary
            const uploadResult = await StorageUtils.uploadAvatar(userId, file);
            
            // Atualizar perfil com novo avatar
            await UserProfileModel.updateAvatar(
                userId, 
                uploadResult.url,           // URL original do Cloudinary
                uploadResult.publicId       // Public ID para transformações
            );
            
            // Remover avatar antigo se existir
            if (currentProfile.avatar_path) {
                StorageUtils.deleteAvatar(currentProfile.avatar_path)
                    .catch(err => console.log('Erro ao deletar avatar antigo:', err));
            }
            
            // Gerar URLs com diferentes tamanhos
            const avatarUrls = StorageUtils.getAvatarUrls(uploadResult.publicId);
            
            console.log(`✅ Avatar atualizado para usuário ${userId}: ${uploadResult.publicId}`);
            
            return {
                avatar_url: uploadResult.url,
                avatar_path: uploadResult.publicId,
                avatar_urls: avatarUrls,
                upload_info: {
                    width: uploadResult.width,
                    height: uploadResult.height,
                    size: uploadResult.size,
                    format: uploadResult.mimeType
                }
            };
        } catch (error) {
            console.error('Erro no upload de avatar:', error);
            throw error;
        }
    }
    
    // Remover avatar
    static async removeAvatar(userId) {
        try {
            const currentProfile = await UserProfileModel.findByUserId(userId);
            if (!currentProfile) {
                throw new Error('Perfil não encontrado');
            }
            
            if (!currentProfile.avatar_path) {
                throw new Error('Usuário não possui avatar');
            }
            
            // Remover do Cloudinary
            await StorageUtils.deleteAvatar(currentProfile.avatar_path);
            
            // Atualizar perfil
            await UserProfileModel.removeAvatar(userId);
            
            console.log(`✅ Avatar removido para usuário ${userId}`);
            
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover avatar:', error);
            throw error;
        }
    }
    
    // Buscar perfis públicos
    static async searchPublicProfiles(searchTerm = '', limit = 20, offset = 0) {
        try {
            const profiles = await UserProfileModel.findPublicProfiles(limit, offset, searchTerm);
            
            // Adicionar URLs de avatar
            return profiles.map(profile => {
                if (profile.avatar_path) {
                    profile.avatar_urls = {
                        small: StorageUtils.getAvatarUrl(profile.avatar_path, { width: 100, height: 100 }),
                        medium: StorageUtils.getAvatarUrl(profile.avatar_path, { width: 200, height: 200 })
                    };
                }
                return profile;
            });
        } catch (error) {
            console.error('Erro ao buscar perfis públicos:', error);
            throw error;
        }
    }
    
    // Criar perfil padrão (usado no registro)
    static async createDefaultProfile(userId, userData) {
        try {
            const profile = await UserProfileModel.createDefaultProfile(userId, userData);
            console.log(`✅ Perfil padrão criado para usuário ${userId}`);
            return profile;
        } catch (error) {
            console.error('Erro ao criar perfil padrão:', error);
            throw error;
        }
    }
}

module.exports = UserProfileService;