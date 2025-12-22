import { apiClient } from './client';

export interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  color?: string;
  icon?: string;
  userId?: number;
  isDefault?: boolean;
  createdAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: 'receita' | 'despesa';
  color?: string;
  icon?: string;
}

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get('/categories');
  return response.data.data || response.data.categories || response.data;
}

// Get categories by type
export async function getCategoriesByType(type: 'receita' | 'despesa'): Promise<Category[]> {
  const response = await apiClient.get(`/categories/type/${type}`);
  return response.data.data || response.data.categories || response.data;
}

// Get default categories
export async function getDefaultCategories(): Promise<Category[]> {
  const response = await apiClient.get('/categories/defaults');
  return response.data.data || response.data.categories || response.data;
}

// Create default categories for user
export async function createDefaultCategories(): Promise<Category[]> {
  const response = await apiClient.post('/categories/defaults');
  return response.data.data || response.data.categories || response.data;
}

// Create a new category
export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  const response = await apiClient.post('/categories', data);
  return response.data.data || response.data;
}

// Delete a category
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

// Get category summary
export async function getCategorySummary(): Promise<any> {
  const response = await apiClient.get('/categories/summary');
  return response.data.data || response.data;
}
