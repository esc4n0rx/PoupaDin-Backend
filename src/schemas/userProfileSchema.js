const { z } = require('zod');

// Schema para atualizar perfil
const updateProfileSchema = z.object({
    name: z.string()
        .min(2, "Nome deve ter no mínimo 2 caracteres")
        .max(100, "Nome deve ter no máximo 100 caracteres")
        .optional(),
    bio: z.string()
        .max(500, "Bio deve ter no máximo 500 caracteres")
        .optional(),
    location: z.string()
        .max(100, "Localização deve ter no máximo 100 caracteres")
        .optional(),
    website: z.string()
        .url("Website deve ser uma URL válida")
        .optional()
        .or(z.literal('')), // Permitir string vazia
    phone: z.string()
        .regex(/^[\+]?[1-9][\d]{0,15}$/, "Telefone deve ser um número válido")
        .optional()
        .or(z.literal('')), // Permitir string vazia
    date_of_birth: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
        .optional(),
    privacy_settings: z.object({
        profile_visible: z.boolean().default(true),
        email_visible: z.boolean().default(false),
        phone_visible: z.boolean().default(false)
    }).optional()
});

// Schema para upload de avatar
const avatarUploadSchema = z.object({
    // Será validado pelo middleware de upload
});

// Schema para reset de senha autenticado
const authenticatedPasswordResetSchema = z.object({
    current_password: z.string().min(1, "Senha atual é obrigatória"),
    new_password: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
    confirm_password: z.string().min(1, "Confirmação de senha é obrigatória")
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Nova senha e confirmação devem ser iguais",
    path: ["confirm_password"],
});

module.exports = {
    updateProfileSchema,
    avatarUploadSchema,
    authenticatedPasswordResetSchema
};