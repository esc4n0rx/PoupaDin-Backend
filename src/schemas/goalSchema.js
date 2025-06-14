const { z } = require('zod');

// Schema para criar objetivo
const createGoalSchema = z.object({
    name: z.string()
        .min(3, "O nome do objetivo deve ter no mínimo 3 caracteres.")
        .max(100, "O nome do objetivo deve ter no máximo 100 caracteres."),
    description: z.string()
        .max(500, "A descrição deve ter no máximo 500 caracteres.")
        .optional(),
    target_amount: z.number()
        .positive("O valor alvo deve ser positivo.")
        .max(999999999.99, "Valor alvo muito alto."),
    monthly_target: z.number()
        .min(0, "A meta mensal deve ser positiva ou zero.")
        .max(999999999.99, "Meta mensal muito alta.")
        .optional(),
    target_date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "A data alvo deve estar no formato YYYY-MM-DD.")
        .optional(),
    color: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar em formato hexadecimal.")
        .default('#10B981')
});

// Schema para atualizar objetivo
const updateGoalSchema = z.object({
    name: z.string()
        .min(3, "O nome do objetivo deve ter no mínimo 3 caracteres.")
        .max(100, "O nome do objetivo deve ter no máximo 100 caracteres.")
        .optional(),
    description: z.string()
        .max(500, "A descrição deve ter no máximo 500 caracteres.")
        .optional(),
    target_amount: z.number()
        .positive("O valor alvo deve ser positivo.")
        .max(999999999.99, "Valor alvo muito alto.")
        .optional(),
    monthly_target: z.number()
        .min(0, "A meta mensal deve ser positiva ou zero.")
        .max(999999999.99, "Meta mensal muito alta.")
        .optional(),
    target_date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "A data alvo deve estar no formato YYYY-MM-DD.")
        .optional(),
    color: z.string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar em formato hexadecimal.")
        .optional(),
    is_active: z.boolean().optional()
});

// Schema para depósito/saque
const goalTransactionSchema = z.object({
    goal_id: z.string().uuid("ID do objetivo inválido."),
    transaction_type: z.enum(['deposit', 'withdrawal'], "Tipo de transação inválido."),
    amount: z.number()
        .positive("O valor deve ser positivo.")
        .max(999999999.99, "Valor muito alto."),
    description: z.string()
        .min(3, "A descrição deve ter no mínimo 3 caracteres.")
        .max(500, "A descrição deve ter no máximo 500 caracteres.")
        .optional()
});

// Schema para marcar como completo
const completeGoalSchema = z.object({
    goal_id: z.string().uuid("ID do objetivo inválido.")
});

module.exports = {
    createGoalSchema,
    updateGoalSchema,
    goalTransactionSchema,
    completeGoalSchema
};