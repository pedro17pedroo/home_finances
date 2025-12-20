import { CategoryRepository } from "../repositories/category.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
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

export class CategoryService {
  static async getAllCategories(): Promise<Category[]> {
    return CategoryRepository.findAll();
  }

  static async getCategoriesByType(
    type: 'receita' | 'despesa'
  ): Promise<Category[]> {
    return CategoryRepository.findByType(type);
  }

  static async getCategoryById(id: number): Promise<Category> {
    const category = await CategoryRepository.findById(id);
    
    if (!category) {
      throw new NotFoundError("Category");
    }
    
    return category;
  }

  static async createCategory(data: CreateCategoryRequest): Promise<Category> {
    // Check if category name already exists
    const existingCategory = await CategoryRepository.findByName(data.name);
    if (existingCategory) {
      throw new BadRequestError("Category with this name already exists");
    }

    const categoryData: InsertCategory = {
      name: data.name,
      type: data.type,
      color: data.color || '#6B7280', // Default gray color
      icon: data.icon,
    };

    return CategoryRepository.create(categoryData);
  }

  static async updateCategory(
    id: number,
    data: UpdateCategoryRequest
  ): Promise<Category> {
    // Verify category exists
    await this.getCategoryById(id);

    // Check if new name already exists (if name is being changed)
    if (data.name) {
      const existingCategory = await CategoryRepository.findByName(data.name);
      if (existingCategory && existingCategory.id !== id) {
        throw new BadRequestError("Category with this name already exists");
      }
    }

    const updateData: Partial<InsertCategory> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;

    return CategoryRepository.update(id, updateData);
  }

  static async deleteCategory(id: number): Promise<void> {
    // Verify category exists
    await this.getCategoryById(id);
    
    // Get category to check its name
    const category = await this.getCategoryById(id);
    
    // Check if category is being used in transactions
    const transactionCount = await CategoryRepository.getTransactionCount(category.name);
    if (transactionCount > 0) {
      throw new BadRequestError("Cannot delete category that is being used in transactions");
    }
    
    await CategoryRepository.delete(id);
  }

  static async getCategorySummary() {
    const categories = await CategoryRepository.findAll();
    
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

  static async getDefaultCategories(): Promise<{ receita: string[], despesa: string[] }> {
    return {
      receita: [
        'Salário',
        'Freelance',
        'Investimentos',
        'Vendas',
        'Prêmios',
        'Outros'
      ],
      despesa: [
        'Alimentação',
        'Moradia',
        'Transporte',
        'Lazer',
        'Saúde',
        'Educação',
        'Compras',
        'Contas',
        'Outros'
      ]
    };
  }

  static async createDefaultCategories(): Promise<Category[]> {
    const defaults = await this.getDefaultCategories();
    const createdCategories: Category[] = [];

    // Create income categories
    for (const name of defaults.receita) {
      const existingCategory = await CategoryRepository.findByName(name);
      if (!existingCategory) {
        const categoryData: InsertCategory = {
          name,
          type: 'receita',
          color: '#10B981', // Green for income
        };
        const category = await CategoryRepository.create(categoryData);
        createdCategories.push(category);
      }
    }

    // Create expense categories
    for (const name of defaults.despesa) {
      const existingCategory = await CategoryRepository.findByName(name);
      if (!existingCategory) {
        const categoryData: InsertCategory = {
          name,
          type: 'despesa',
          color: '#EF4444', // Red for expenses
        };
        const category = await CategoryRepository.create(categoryData);
        createdCategories.push(category);
      }
    }

    return createdCategories;
  }
}