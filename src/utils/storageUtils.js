const CloudinaryConfig = require('../config/cloudinaryConfig');
const path = require('path');

/**
 * Utilitários para gerenciar uploads no Cloudinary
 */
class StorageUtils {
    
    static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    static ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    // Validar arquivo de avatar
    static validateAvatarFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('Nenhum arquivo foi enviado');
            return errors;
        }
        
        // Validar tamanho
        if (file.size > this.MAX_FILE_SIZE) {
            errors.push(`Arquivo muito grande. Tamanho máximo: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        
        // Validar tipo
        if (!this.ALLOWED_TYPES.includes(file.mimetype)) {
            errors.push(`Tipo de arquivo não permitido. Tipos aceitos: ${this.ALLOWED_TYPES.join(', ')}`);
        }
        
        return errors;
    }
    
    // Gerar ID público único para o Cloudinary
    static generatePublicId(userId, originalName) {
        const timestamp = Date.now();
        const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, '_');
        return `${userId}/${timestamp}_${baseName}`;
    }
    
    // Upload de avatar para Cloudinary
    static async uploadAvatar(userId, file) {
        try {
            // Verificar se Cloudinary está configurado
            if (!CloudinaryConfig.checkConfiguration()) {
                throw new Error('Cloudinary não está configurado');
            }
            
            // Validar arquivo
            const validationErrors = this.validateAvatarFile(file);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join(', '));
            }
            
            const cloudinary = CloudinaryConfig.getInstance();
            const avatarConfig = CloudinaryConfig.getAvatarConfig();
            
            // Gerar public_id único
            const publicId = this.generatePublicId(userId, file.originalname);
            
            // Configuração de upload
            const uploadOptions = {
                public_id: publicId,
                folder: avatarConfig.folder,
                allowed_formats: avatarConfig.allowed_formats,
                transformation: avatarConfig.transformation,
                overwrite: true,
                invalidate: true,
                resource_type: 'auto'
            };
            
            // Se existe upload_preset, usar ele
            if (avatarConfig.upload_preset) {
                uploadOptions.upload_preset = avatarConfig.upload_preset;
            }
            
            // Upload via stream (mais eficiente para buffer)
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) {
                            console.error('Erro no upload do Cloudinary:', error);
                            reject(new Error('Falha no upload do arquivo'));
                        } else {
                            resolve(result);
                        }
                    }
                );
                
                // Enviar buffer do arquivo
                uploadStream.end(file.buffer);
            });
            
            console.log(`✅ Avatar uploaded para Cloudinary: ${uploadResult.public_id}`);
            
            return {
                publicId: uploadResult.public_id,
                url: uploadResult.secure_url,
                version: uploadResult.version,
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                width: uploadResult.width,
                height: uploadResult.height
            };
            
        } catch (error) {
            console.error('Erro no upload de avatar:', error);
            throw error;
        }
    }
    
    // Remover avatar do Cloudinary
    static async deleteAvatar(publicId) {
        try {
            if (!publicId) return true;
            
            if (!CloudinaryConfig.checkConfiguration()) {
                console.warn('Cloudinary não configurado - não é possível deletar arquivo');
                return false;
            }
            
            const cloudinary = CloudinaryConfig.getInstance();
            
            const result = await cloudinary.uploader.destroy(publicId);
            
            if (result.result === 'ok') {
                console.log(`✅ Avatar deletado do Cloudinary: ${publicId}`);
                return true;
            } else {
                console.warn(`⚠️ Não foi possível deletar avatar: ${publicId}`, result);
                return false;
            }
            
        } catch (error) {
            console.error('Erro ao deletar avatar:', error);
            return false;
        }
    }
    
    // Obter URLs com diferentes transformações
    static getAvatarUrls(publicId) {
        if (!publicId || !CloudinaryConfig.checkConfiguration()) {
            return null;
        }
        
        const presets = CloudinaryConfig.getTransformationPresets();
        const urls = {};
        
        Object.keys(presets).forEach(size => {
            urls[size] = CloudinaryConfig.generateUrl(publicId, presets[size]);
        });
        
        return urls;
    }
    
    // Obter URL com transformação específica
    static getAvatarUrl(publicId, transformations = {}) {
        if (!publicId || !CloudinaryConfig.checkConfiguration()) {
            return null;
        }
        
        return CloudinaryConfig.generateUrl(publicId, transformations);
    }
    
    // Verificar se Cloudinary está disponível
    static async checkHealth() {
        try {
            if (!CloudinaryConfig.checkConfiguration()) {
                return { 
                    status: 'disabled', 
                    message: 'Cloudinary não configurado' 
                };
            }
            
            const cloudinary = CloudinaryConfig.getInstance();
            
            // Teste simples - buscar informações da conta
            const result = await cloudinary.api.ping();
            
            return {
                status: 'healthy',
                message: 'Cloudinary funcionando corretamente',
                cloudName: CloudinaryConfig.config.cloud_name,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                status: 'error',
                message: `Erro na comunicação com Cloudinary: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    // Inicializar Cloudinary (deve ser chamado na inicialização da app)
    static async initialize() {
        console.log('🖼️ Inicializando Cloudinary...');
        
        const success = CloudinaryConfig.initialize();
        
        if (success) {
            // Testar conectividade
            const health = await this.checkHealth();
            console.log(`📊 Status do Cloudinary: ${health.status}`);
            
            if (health.status !== 'healthy') {
                console.warn('⚠️ Cloudinary pode não estar funcionando corretamente');
            }
        }
        
        return success;
    }
}

module.exports = StorageUtils;