import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCategories, 
  getCategoriesByType, 
  getDefaultCategories,
  createDefaultCategories,
  createCategory,
  deleteCategory,
  Category,
  CreateCategoryRequest
} from '../../../shared/api/categories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
}

export function useCategoriesByType(type: 'receita' | 'despesa') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => getCategoriesByType(type),
  });
}

export function useDefaultCategories() {
  return useQuery({
    queryKey: ['categories', 'defaults'],
    queryFn: getDefaultCategories,
  });
}

export function useCreateDefaultCategories() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createDefaultCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
