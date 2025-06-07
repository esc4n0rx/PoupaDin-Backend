 
const userModel = require('../models/userModel');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/userSchema');
const { sendPasswordResetEmail } = require('../services/mailService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 1. Registro de Usuario
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
        
        // Nao retorne a senha hasheada
        const { password_hash, ...userResponse } = newUser;

        res.status(201).json({ message: 'Usuário registrado com sucesso!', user: userResponse });
    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 2. Login de Usuario
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);

        const user = await userModel.findByEmail(validatedData.email);
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' }); // Nao especifique se o email ou a senha estao errados
        }

        const isPasswordCorrect = await comparePassword(validatedData.password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        // Gerar token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        res.status(200).json({ message: 'Login bem-sucedido!', token });

    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 3. Solicitar Redefinicao de Senha
const forgotPassword = async (req, res) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);

        const user = await userModel.findByEmail(email);
        if (user) {
            const resetToken = await userModel.createPasswordResetToken(user.id);
            await sendPasswordResetEmail(user.email, resetToken);
        }

        // Resposta generica para nao revelar se um email existe no sistema
        res.status(200).json({ message: 'Se um usuário com este e-mail existir, um link de redefinição de senha foi enviado.' });

    } catch (error) {
        if (error instanceof require('zod').ZodError) {
            return res.status(400).json({ message: 'Erro de validação.', errors: error.errors });
        }
        console.error('Erro ao solicitar redefinição de senha:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// 4. Efetuar a Redefinicao de Senha
const resetPassword = async (req, res) => {
    try {
        const { token, password } = resetPasswordSchema.parse(req.body);

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const resetRequest = await userModel.findResetToken(tokenHash);

        if (!resetRequest || new Date() > new Date(resetRequest.expires_at)) {
            if (resetRequest) {
                await userModel.deleteResetToken(resetRequest.id);
            }
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }
        
        const newPasswordHash = await hashPassword(password);
        await userModel.updatePassword(resetRequest.user_id, newPasswordHash);
        
        // O token foi usado, entao deve ser deletado
        await userModel.deleteResetToken(resetRequest.id);

        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
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
    resetPassword
};