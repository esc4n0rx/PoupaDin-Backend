const userModel = require('../models/userModel');
const RefreshTokenModel = require('../models/refreshTokenModel');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const UserProfileService = require('../services/userProfileService');
const TokenUtils = require('../utils/tokenUtils'); 
const { 
    registerSchema, 
    loginSchema, 
    forgotPasswordSchema, 
    verifyResetCodeSchema,
    resetPasswordSchema 
} = require('../schemas/userSchema');
const { sendPasswordResetEmail } = require('../services/mailService');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const existingUser = await userModel.findByEmail(validatedData.email);
        if (existingUser) {
            return res.status(409).json({ message: 'Este e-mail já está em uso.' });
        }

        const passwordHash = await hashPassword(validatedData.password);

        const newUser = await userModel.create({
            name: validatedData.name,
            email: validatedData.email,
            password_hash: passwordHash,
            date_of_birth: validatedData.date_of_birth,
        });
        
        try {
            await UserProfileService.createDefaultProfile(newUser.id, validatedData);
            console.log(`✅ Perfil básico criado para novo usuário: ${newUser.email}`);
        } catch (profileError) {
            console.error('⚠️ Erro ao criar perfil básico:', profileError);
            // Não falhar o registro se não conseguir criar o perfil
        }
        
        const { password_hash, ...userResponse } = newUser;

        res.status(201).json({ 
            message: 'Usuário registrado com sucesso!', 
            user: userResponse 
        });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 2. Login de Usuário (MODIFICADO para incluir refresh token)
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        const user = await userModel.findByEmail(validatedData.email);
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const isPasswordCorrect = await comparePassword(validatedData.password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        // NOVO: Gerar access token e refresh token usando TokenUtils
        const accessToken = TokenUtils.generateAccessToken({
            id: user.id,
            email: user.email
        });
        
        const refreshToken = TokenUtils.generateRefreshToken({
            id: user.id,
            email: user.email
        });
        
        // NOVO: Salvar refresh token no banco de dados
        await RefreshTokenModel.create(user.id, refreshToken);
        
        // NOVO: Limitar número de tokens por usuário (máximo 5 dispositivos)
        await RefreshTokenModel.limitUserTokens(user.id, 5);

        const setupCompleted = user.initial_setup_completed || false;

        console.log(`✅ Login realizado com sucesso: ${user.email}`);

        res.status(200).json({ 
            message: 'Login bem-sucedido!', 
            accessToken,        // MODIFICADO: era 'token'
            refreshToken,       // NOVO: refresh token
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                initial_setup_completed: setupCompleted
            }
        });

    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 3. Solicitar Redefinição de Senha (sem mudanças)
const forgotPassword = async (req, res) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);

        const user = await userModel.findByEmail(email);
        if (user) {
            try {
                const resetCode = await userModel.createPasswordResetCode(user.id);
                await sendPasswordResetEmail(user.email, resetCode);
                
                console.log(`📧 Código de recuperação enviado para ${user.email}: ${resetCode}`);
            } catch (emailError) {
                console.error('Erro ao enviar email de recuperação:', emailError);
                // Não exposar erro específico de email para o usuário
            }
        }

        // Resposta genérica para não revelar se um email existe no sistema
        res.status(200).json({ 
            message: 'Se um usuário com este e-mail existir, um código de recuperação foi enviado.',
            instruction: 'Verifique sua caixa de entrada e spam. O código expira em 15 minutos.'
        });

    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao solicitar redefinição de senha:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 4. Verificar Código de Recuperação (sem mudanças)
const verifyResetCode = async (req, res) => {
    try {
        const { code } = verifyResetCodeSchema.parse(req.body);

        const resetRequest = await userModel.findValidResetCode(code);

        if (!resetRequest) {
            return res.status(400).json({ 
                message: 'Código inválido, expirado ou já utilizado.',
                code: 'INVALID_CODE'
            });
        }

        res.status(200).json({ 
            message: 'Código válido! Você pode prosseguir com a redefinição da senha.',
            valid: true
        });

    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao verificar código:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 5. Efetuar a Redefinição de Senha (MODIFICADO para revogar refresh tokens)
const resetPassword = async (req, res) => {
    try {
        const { code, password } = resetPasswordSchema.parse(req.body);

        const resetRequest = await userModel.findValidResetCode(code);

        if (!resetRequest) {
            return res.status(400).json({ 
                message: 'Código inválido, expirado ou já utilizado.',
                code: 'INVALID_CODE'
            });
        }
        
        const newPasswordHash = await hashPassword(password);
        await userModel.updatePassword(resetRequest.user_id, newPasswordHash);
        
        // Marcar código como usado
        await userModel.markResetCodeAsUsed(resetRequest.id);
        
        // NOVO: Revogar todos os refresh tokens por segurança
        await RefreshTokenModel.revokeAllUserTokens(resetRequest.user_id);

        console.log(`🔐 Senha redefinida e tokens revogados para usuário ID: ${resetRequest.user_id}`);

        res.status(200).json({ 
            message: 'Senha redefinida com sucesso! Faça login novamente com sua nova senha.',
            success: true,
            logoutRequired: true // NOVO: indica que o usuário precisa fazer login novamente
        });

    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao redefinir senha:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    verifyResetCode,
    resetPassword
};