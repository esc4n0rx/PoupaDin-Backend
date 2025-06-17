const TokenUtils = require('../utils/tokenUtils'); // NOVA LINHA

// MIDDLEWARE PRINCIPAL: Autenticação por Access Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            message: 'Token de acesso requerido.',
            code: 'ACCESS_TOKEN_REQUIRED'
        });
    }

    // MODIFICADO: Usar TokenUtils em vez de jwt.verify direto
    try {
        const user = TokenUtils.verifyAccessToken(token);
        req.user = user; // Adiciona dados do usuário ao request
        next();
    } catch (err) {
        // Diferentes tipos de erro para melhor tratamento no frontend
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expirado. Use o refresh token para renovar.',
                code: 'ACCESS_TOKEN_EXPIRED'
            });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                message: 'Token inválido.',
                code: 'ACCESS_TOKEN_INVALID'
            });
        } else {
            console.error('Erro na verificação do token:', err);
            return res.status(403).json({ 
                message: 'Erro na autenticação.',
                code: 'AUTH_ERROR'
            });
        }
    }
};

// NOVO MIDDLEWARE: Autenticação opcional (para rotas que funcionam com ou sem login)
const optionalAuthentication = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null; // Usuário não autenticado
        return next();
    }

    try {
        const user = TokenUtils.verifyAccessToken(token);
        req.user = user;
    } catch (err) {
        req.user = null; // Token inválido, tratar como não autenticado
    }

    next();
};

// NOVO MIDDLEWARE: Verificar se o token está próximo do vencimento
const checkTokenExpiration = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && TokenUtils.isTokenExpiringSoon(token)) {
        // Adicionar header sugerindo renovação
        res.setHeader('X-Token-Refresh-Suggested', 'true');
    }

    next();
};

module.exports = {
    authenticateToken,
    optionalAuthentication,      // NOVO
    checkTokenExpiration        // NOVO
};