const { v2: cloudinary } = require('cloudinary');

/**
 * Configuração do Cloudinary
 */
class CloudinaryConfig {
    
    static isConfigured = false;
    
    static config = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    };
    
    // Configurações específicas para avatares
    static avatarConfig = {
        folder: process.env.CLOUDINARY_FOLDER || 'poupadin/avatars',
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        max_file_size: 5000000, // 5MB em bytes
        transformation: [
            {
                width: 800,
                height: 800,
                crop: 'limit',
                quality: 'auto:good',
                fetch_format: 'auto'
            }
        ]
    };
    
    // Inicializar Cloudinary
    static initialize() {
        try {
            // Verificar variáveis obrigatórias
            if (!this.config.cloud_name || !this.config.api_key || !this.config.api_secret) {
                console.warn('⚠️ Cloudinary não configurado - algumas variáveis estão faltando');
                console.warn('   Necessário: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
                return false;
            }
            
            // Configurar Cloudinary
            cloudinary.config(this.config);
            
            this.isConfigured = true;
            console.log('✅ Cloudinary configurado com sucesso');
            console.log(`   Cloud Name: ${this.config.cloud_name}`);
            console.log(`   Folder: ${this.avatarConfig.folder}`);
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao configurar Cloudinary:', error.message);
            return false;
        }
    }
    
    // Verificar se está configurado
    static checkConfiguration() {
        return this.isConfigured;
    }
    
    // Obter configuração para avatares
    static getAvatarConfig() {
        return this.avatarConfig;
    }
    
    // Obter instância do Cloudinary
    static getInstance() {
        if (!this.isConfigured) {
            throw new Error('Cloudinary não está configurado');
        }
        return cloudinary;
    }
    
    // Gerar URL com transformações
    static generateUrl(publicId, transformations = {}) {
        if (!this.isConfigured) {
            return null;
        }
        
        return cloudinary.url(publicId, {
            secure: true,
            ...transformations
        });
    }
    
    // Configurações de transformação predefinidas
    static getTransformationPresets() {
        return {
            small: {
                width: 100,
                height: 100,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto:good',
                fetch_format: 'auto'
            },
            medium: {
                width: 200,
                height: 200,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto:good',
                fetch_format: 'auto'
            },
            large: {
                width: 400,
                height: 400,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto:good',
                fetch_format: 'auto'
            },
            original: {
                quality: 'auto:best',
                fetch_format: 'auto'
            }
        };
    }
}

module.exports = CloudinaryConfig;