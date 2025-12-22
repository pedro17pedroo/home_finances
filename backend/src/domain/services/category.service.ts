import { CategoryRepository } from "../repositories/category.repository.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../../core/errors/app-error.js";
import type { Category, InsertCategory } from "../../core/database/schema.js";

export interface CreateCategoryRequest {
  name: string;
  type: 'receita' | 'despesa';
  color?: string;
  icon?: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: 'receita' | 'despesa';
  color?: string;
  icon?: string;
  description?: string;
}

// Default categories for new users
const DEFAULT_CATEGORIES = {
  receita: [
    { name: 'Salário', color: '#10B981' },
    { name: 'Freelance', color: '#059669' },
    { name: 'Investimentos', color: '#0D9488' },
    { name: 'Vendas', color: '#14B8A6' },
    { name: 'Prêmios', color: '#22C55E' },
    { name: 'Outros', color: '#6B7280' },
  ],
  despesa: [
    { name: 'Alimentação', color: '#EF4444' },
    { name: 'Moradia', color: '#F97316' },
    { name: 'Transporte', color: '#F59E0B' },
    { name: 'Lazer', color: '#EC4899' },
    { name: 'Saúde', color: '#8B5CF6' },
    { name: 'Educação', color: '#6366F1' },
    { name: 'Compras', color: '#D946EF' },
    { name: 'Contas', color: '#DC2626' },
    { name: 'Outros', color: '#6B7280' },
  ]
};

export class CategoryService {
  /**
   * Get all categories for a user
   */
  static async getAllCategories(userId: number): Promise<Category[]> {
    return CategoryRepository.findAllByUser(userId);
  }

  /**
   * Get categories by type for a user
   */
  static async getCategoriesByType(
    type: 'receita' | 'despesa',
    userId: number
  ): Promise<Category[]> {
    return CategoryRepository.findByTypeAndUser(type, userId);
  }

  /**
   * Get a specific category by ID
   */
  static async getCategoryById(id: number, userId: number): Promise<Category> {
    const category = await CategoryRepository.findByIdAndUser(id, userId);
    
    if (!category) {
      throw new NotFoundError("Category");
    }
    
    return category;
  }

  /**
   * Create a new category for a user
   */
  static async createCategory(data: CreateCategoryRequest, userId: number): Promise<Category> {
    // Check if category name already exists for this user
    const existingCategory = await CategoryRepository.findByNameAndUser(data.name, userId);
    if (existingCategory) {
      throw new BadRequestError("Categoria com este nome já existe");
    }

    const categoryData: InsertCategory = {
      userId,
      name: data.name,
      type: data.type,
      color: data.color || '#6B7280',
      icon: data.icon,
      isDefault: false,
    };

    return CategoryRepository.create(categoryData);
  }

  /**
   * Update a category
   */
  static async updateCategory(
    id: number,
    data: UpdateCategoryRequest,
    userId: number
  ): Promise<Category> {
    // Verify category exists and belongs to user
    await this.getCategoryById(id, userId);

    // Check if new name already exists for this user
    if (data.name) {
      const existingCategory = await CategoryRepository.findByNameAndUser(data.name, userId);
      if (existingCategory && existingCategory.id !== id) {
        throw new BadRequestError("Categoria com este nome já existe");
      }
    }

    const updateData: Partial<InsertCategory> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;

    return CategoryRepository.update(id, updateData);
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id: number, userId: number): Promise<void> {
    // Verify category exists and belongs to user
    const category = await this.getCategoryById(id, userId);
    
    // Check if category is being used in transactions
    const transactionCount = await CategoryRepository.getTransactionCountByUser(category.name, userId);
    if (transactionCount > 0) {
      throw new BadRequestError("Não é possível excluir categoria que está sendo usada em transações");
    }
    
    await CategoryRepository.delete(id);
  }

  /**
   * Get category summary for a user
   */
  static async getCategorySummary(userId: number) {
    const categories = await CategoryRepository.findAllByUser(userId);
    
    const summary = {
      totalCategories: categories.length,
      incomeCategories: 0,
      expenseCategories: 0,
      categoriesByType: {
        receita: [] as Category[],
        despesa: [] as Category[],
      },
    };

    categories.forEach(category => {
      if (category.type === 'receita') {
        summary.incomeCategories++;
        summary.categoriesByType.receita.push(category);
      } else {
        summary.expenseCategories++;
        summary.categoriesByType.despesa.push(category);
      }
    });

    return summary;
  }

  /**
   * Get default category names
   */
  static getDefaultCategoryNames(): { receita: string[], despesa: string[] } {
    return {
      receita: DEFAULT_CATEGORIES.receita.map(c => c.name),
      despesa: DEFAULT_CATEGORIES.despesa.map(c => c.name),
    };
  }

  /**
   * Create default categories for a new user
   * This should be called when a user registers
   */
  static async createDefaultCategoriesForUser(userId: number): Promise<Category[]> {
    const createdCategories: Category[] = [];

    // Check if user already has categories
    const existingCount = await CategoryRepository.countByUser(userId);
    if (existingCount > 0) {
      // User already has categories, skip
      return [];
    }

    // Create income categories
    for (const cat of DEFAULT_CATEGORIES.receita) {
      const categoryData: InsertCategory = {
        userId,
        name: cat.name,
        type: 'receita',
        color: cat.color,
        isDefault: true,
      };
      const category = await CategoryRepository.create(categoryData);
      createdCategories.push(category);
    }

    // Create expense categories
    for (const cat of DEFAULT_CATEGORIES.despesa) {
      const categoryData: InsertCategory = {
        userId,
        name: cat.name,
        type: 'despesa',
        color: cat.color,
        isDefault: true,
      };
      const category = await CategoryRepository.create(categoryData);
      createdCategories.push(category);
    }

    return createdCategories;
  }
}
