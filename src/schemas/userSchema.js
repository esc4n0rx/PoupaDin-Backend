// src/schemas/userSchema.js
const { z } = require('zod');

// Schema para o registro de um novo usuário
const registerSchema = z.object({
    name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
    email: z.string().email("Formato de e-mail inválido."),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data de nascimento deve estar no formato YYYY-MM-DD."),
});

// Schema para o login
const loginSchema = z.object({
    email: z.string().email("Formato de e-mail inválido."),
    password: z.string().min(1, "A senha é obrigatória."),
});

// Schema para solicitar a redefinição de senha
const forgotPasswordSchema = z.object({
    email: z.string().email("Formato de e-mail inválido."),
});

// Schema para verificar o código de recuperação
const verifyResetCodeSchema = z.object({
    code: z.string().regex(/^\d{6}$/, "O código deve ter exatamente 6 dígitos."),
});

// Schema para redefinir a senha com código
const resetPasswordSchema = z.object({
    code: z.string().regex(/^\d{6}$/, "O código deve ter exatamente 6 dígitos."),
    password: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres."),
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    verifyResetCodeSchema,
    resetPasswordSchema
};