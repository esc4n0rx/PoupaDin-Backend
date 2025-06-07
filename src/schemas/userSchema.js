 
const { z } = require('zod');

// Schema para o registro de um novo usuario
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

// Schema para solicitar a redefinicao de senha
const forgotPasswordSchema = z.object({
    email: z.string().email("Formato de e-mail inválido."),
});

// Schema para efetivamente redefinir a senha
const resetPasswordSchema = z.object({
    token: z.string().min(1, "O token é obrigatório."),
    password: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres."),
});


module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};