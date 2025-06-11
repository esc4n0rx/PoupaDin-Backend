const { z } = require('zod');

// Schema para criar orçamento completo
const createBudgetSchema = z.object({
    name: z.string().min(3, "O nome do orçamento deve ter no mínimo 3 caracteres.").optional(),
    incomes: z.array(z.object({
        description: z.string().min(3, "A descrição da renda deve ter no mínimo 3 caracteres."),
        amount: z.number().positive("O valor da renda deve ser positivo."),
        receive_day: z.number().int().min(1).max(31, "O dia de recebimento deve estar entre 1 e 31.")
    })).min(1, "Pelo menos uma fonte de renda é obrigatória."),
    categories: z.array(z.object({
        name: z.string().min(2, "O nome da categoria deve ter no mínimo 2 caracteres."),
        allocated_amount: z.number().min(0, "O valor alocado deve ser positivo ou zero."),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar em formato hexadecimal.").optional()
    })).optional()
});

// Schema para dar baixa em categoria
const categoryExpenseSchema = z.object({
    category_id: z.string().uuid("ID da categoria inválido."),
    amount: z.number().positive("O valor da despesa deve ser positivo."),
    description: z.string().min(3, "A descrição deve ter no mínimo 3 caracteres.")
});

// Schema para remanejamento entre categorias
const transferBetweenCategoriesSchema = z.object({
    from_category_id: z.string().uuid("ID da categoria de origem inválido."),
    to_category_id: z.string().uuid("ID da categoria de destino inválido."),
    amount: z.number().positive("O valor da transferência deve ser positivo."),
    description: z.string().min(3, "A descrição deve ter no mínimo 3 caracteres.")
});

// Schema para atualizar categoria
const updateCategorySchema = z.object({
    name: z.string().min(2, "O nome da categoria deve ter no mínimo 2 caracteres.").optional(),
    allocated_amount: z.number().min(0, "O valor alocado deve ser positivo ou zero.").optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "A cor deve estar em formato hexadecimal.").optional()
});

module.exports = {
    createBudgetSchema,
    categoryExpenseSchema,
    transferBetweenCategoriesSchema,
    updateCategorySchema
};