import { CategoryRepository } from "../repositories/category.repository.js";
import { 
  NotFoundError, 
  BadRequestError, 
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
   * Get all categories for a user (backward compatibility)
   */
  static async getAllCategories(userId: number): Promise<Category[]> {
    return CategoryRepository.findAllByUser(userId);
  }

  /**
   * Get all categories for an organization (multi-tenant)
   */
  static async getAllCategoriesByOrganization(organizationId: number): Promise<Category[]> {
    return CategoryRepository.findAllByOrganization(organizationId);
  }

  /**
   * Get categories by organization or user (for migration period)
   */
  static async getCategories(organizationId: number | null, userId: number): Promise<Category[]> {
    return CategoryRepository.findByOrganizationOrUser(organizationId, userId);
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
   * Get categories by type for an organization
   */
  static async getCategoriesByTypeAndOrganization(
    type: 'receita' | 'despesa',
    organizationId: number
  ): Promise<Category[]> {
    return CategoryRepository.findByTypeAndOrganization(type, organizationId);
  }

  /**
   * Get a specific category by ID
   */
  static async getCategoryById(id: number, userId: number, organizationId?: number | null): Promise<Category> {
    let category: Category | null = null;
    
    if (organizationId) {
      category = await CategoryRepository.findByIdAndOrganization(id, organizationId);
    } else {
      category = await CategoryRepository.findByIdAndUser(id, userId);
    }
    
    if (!category) {
      throw new NotFoundError("Category");
    }
    
    return category;
  }

  /**
   * Create a new category for a user/organization
   */
  static async createCategory(data: CreateCategoryRequest, userId: number, organizationId?: number | null): Promise<Category> {
    // Check if category name already exists
    let existingCategory: Category | null = null;
    
    if (organizationId) {
      existingCategory = await CategoryRepository.findByNameAndOrganization(data.name, organizationId);
    } else {
      existingCategory = await CategoryRepository.findByNameAndUser(data.name, userId);
    }
    
    if (existingCategory) {
      throw new BadRequestError("Categoria com este nome já existe");
    }

    const categoryData: InsertCategory = {
      userId,
      organizationId: organizationId || undefined,
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
    userId: number,
    organizationId?: number | null
  ): Promise<Category> {
    // Verify category exists and belongs to user/organization
    await this.getCategoryById(id, userId, organizationId);

    // Check if new name already exists
    if (data.name) {
      let existingCategory: Category | null = null;
      
      if (organizationId) {
        existingCategory = await CategoryRepository.findByNameAndOrganization(data.name, organizationId);
      } else {
        existingCategory = await CategoryRepository.findByNameAndUser(data.name, userId);
      }
      
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
  static async deleteCategory(id: number, userId: number, organizationId?: number | null): Promise<void> {
    // Verify category exists and belongs to user/organization
    const category = await this.getCategoryById(id, userId, organizationId);
    
    // Check if category is being used in transactions
    let transactionCount: number;
    
    if (organizationId) {
      transactionCount = await CategoryRepository.getTransactionCountByOrganization(category.name, organizationId);
    } else {
      transactionCount = await CategoryRepository.getTransactionCountByUser(category.name, userId);
    }
    
    if (transactionCount > 0) {
      throw new BadRequestError("Não é possível excluir categoria que está sendo usada em transações");
    }
    
    await CategoryRepository.delete(id);
  }

  /**
   * Get category summary for a user/organization
   */
  static async getCategorySummary(userId: number, organizationId?: number | null) {
    let categories: Category[];
    
    if (organizationId) {
      categories = await CategoryRepository.findAllByOrganization(organizationId);
    } else {
      categories = await CategoryRepository.findAllByUser(userId);
    }
    
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
   * Create default categories for a new user (backward compatibility)
   */
  static async createDefaultCategoriesForUser(userId: number): Promise<Category[]> {
    return this.createDefaultCategories(userId, null);
  }

  /**
   * Create default categories for a new organization
   */
  static async createDefaultCategoriesForOrganization(organizationId: number, userId: number): Promise<Category[]> {
    return this.createDefaultCategories(userId, organizationId);
  }

  /**
   * Create default categories for a new user/organization
   */
  static async createDefaultCategories(userId: number, organizationId: number | null): Promise<Category[]> {
    const createdCategories: Category[] = [];

    // Check if user/organization already has categories
    let existingCount: number;
    
    if (organizationId) {
      existingCount = await CategoryRepository.countByOrganization(organizationId);
    } else {
      existingCount = await CategoryRepository.countByUser(userId);
    }
    
    if (existingCount > 0) {
      // Already has categories, skip
      return [];
    }

    // Create income categories
    for (const cat of DEFAULT_CATEGORIES.receita) {
      const categoryData: InsertCategory = {
        userId,
        organizationId: organizationId || undefined,
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
        organizationId: organizationId || undefined,
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
