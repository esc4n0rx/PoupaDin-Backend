const multer = require('multer');
const StorageUtils = require('../utils/storageUtils');

// Configuração do multer para upload em memória
const storage = multer.memoryStorage();

// Filtro para validar tipos de arquivo
const fileFilter = (req, file, cb) => {
    if (StorageUtils.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${StorageUtils.ALLOWED_TYPES.join(', ')}`), false);
    }
};

// Configuração do multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: StorageUtils.MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: fileFilter
});

// Middleware para upload de avatar
const uploadAvatar = upload.single('avatar');

// Wrapper para tratar erros do multer
const uploadAvatarMiddleware = (req, res, next) => {
    uploadAvatar(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    message: `Arquivo muito grande. Tamanho máximo: ${StorageUtils.MAX_FILE_SIZE / (1024 * 1024)}MB`
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    message: 'Apenas um arquivo é permitido'
                });
            }
            return res.status(400).json({
                message: `Erro no upload: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        next();
    });
};

module.exports = {
    uploadAvatarMiddleware
};