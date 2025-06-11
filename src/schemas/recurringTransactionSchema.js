const { z } = require('zod');

// Enum para frequências de recorrência
const FREQUENCY_TYPES = {
    DAILY: 'daily',
    WEEKLY: 'weekly', 
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
};

// Schema para criar transação recorrente
const createRecurringTransactionSchema = z.object({
    category_id: z.string().uuid("ID da categoria inválido."),
    description: z.string().min(3, "A descrição deve ter no mínimo 3 caracteres."),
    amount: z.number().positive("O valor deve ser positivo."),
    frequency: z.enum([
        FREQUENCY_TYPES.DAILY,
        FREQUENCY_TYPES.WEEKLY,
        FREQUENCY_TYPES.MONTHLY,
        FREQUENCY_TYPES.YEARLY
    ], "Frequência inválida."),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data de início deve estar no formato YYYY-MM-DD."),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data de fim deve estar no formato YYYY-MM-DD.").optional(),
    execution_day: z.number().int().min(1).max(31, "O dia de execução deve estar entre 1 e 31.").optional(),
    is_active: z.boolean().default(true)
});

// Schema para atualizar transação recorrente
const updateRecurringTransactionSchema = z.object({
    description: z.string().min(3, "A descrição deve ter no mínimo 3 caracteres.").optional(),
    amount: z.number().positive("O valor deve ser positivo.").optional(),
    frequency: z.enum([
        FREQUENCY_TYPES.DAILY,
        FREQUENCY_TYPES.WEEKLY,
        FREQUENCY_TYPES.MONTHLY,
        FREQUENCY_TYPES.YEARLY
    ], "Frequência inválida.").optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data de fim deve estar no formato YYYY-MM-DD.").optional(),
    execution_day: z.number().int().min(1).max(31, "O dia de execução deve estar entre 1 e 31.").optional(),
    is_active: z.boolean().optional()
});

module.exports = {
    createRecurringTransactionSchema,
    updateRecurringTransactionSchema,
    FREQUENCY_TYPES
};