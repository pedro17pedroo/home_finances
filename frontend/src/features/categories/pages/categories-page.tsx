import { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, X, Loader2 } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { useCategories, useCreateCategory, useDeleteCategory } from '../hooks/use-categories';
import { showDeleteConfirm, showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import type { Category, CreateCategoryRequest } from '../../../shared/api/categories';

type TabType = 'receitas' | 'despesas';

export function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('receitas');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#10B981' });

  const { data: categories, isLoading } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const filteredCategories = categories?.filter(
    (cat) => (activeTab === 'receitas' ? cat.type === 'receita' : cat.type === 'despesa')
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData: CreateCategoryRequest = {
        name: formData.name,
        type: activeTab === 'receitas' ? 'receita' : 'despesa',
        color: formData.color,
      };
      await createCategoryMutation.mutateAsync(categoryData);
      setFormData({ name: '', color: activeTab === 'receitas' ? '#10B981' : '#EF4444' });
      setShowForm(false);
      setEditingCategory(null);
      showSuccessToast('Categoria criada com sucesso!');
    } catch (error) {
      console.error('Error creating category:', error);
      showErrorToast('Erro ao criar categoria');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color || '#10B981' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta categoria');
    if (confirmed) {
      try {
        await deleteCategoryMutation.mutateAsync(id);
        showSuccessToast('Categoria excluída com sucesso!');
      } catch (error) {
        console.error('Error deleting category:', error);
        showErrorToast('Erro ao excluir categoria');
      }
    }
  };

  const openNewForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: activeTab === 'receitas' ? '#10B981' : '#EF4444' });
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie suas categorias de receitas e despesas</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('receitas')}
            className={`flex-1 py-3 text-sm font-medium rounded-l-lg border transition-colors ${
              activeTab === 'receitas'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border-gray-200 dark:border-gray-700'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setActiveTab('despesas')}
            className={`flex-1 py-3 text-sm font-medium rounded-r-lg border-t border-r border-b transition-colors ${
              activeTab === 'despesas'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border-gray-200 dark:border-gray-700'
            }`}
          >
            Despesas
          </button>
        </div>

        {/* Content */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            {/* Section Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Categorias de {activeTab === 'receitas' ? 'Receitas' : 'Despesas'}
              </h3>
              <Button
                onClick={openNewForm}
                size="sm"
                className={activeTab === 'receitas' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova {activeTab === 'receitas' ? 'Receita' : 'Despesa'}
              </Button>
            </div>

            {/* Categories List */}
            {filteredCategories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color || '#6B7280' }}
                      ></div>
                      <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        disabled={deleteCategoryMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                  Nenhuma categoria de {activeTab === 'receitas' ? 'receita' : 'despesa'} cadastrada
                </h4>
                <p className="text-gray-500 text-sm mb-6">
                  Crie categorias para organizar suas {activeTab === 'receitas' ? 'receitas' : 'despesas'}
                </p>
                <Button
                  onClick={openNewForm}
                  className={activeTab === 'receitas' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Categoria
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingCategory ? 'Editar Categoria' : `Nova Categoria de ${activeTab === 'receitas' ? 'Receita' : 'Despesa'}`}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                {editingCategory ? 'Atualize os dados da categoria.' : 'Adicione uma nova categoria para organizar suas transações.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Categoria
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Alimentação"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#10B981"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCategoryMutation.isPending}
                    className={`flex-1 ${activeTab === 'receitas' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {createCategoryMutation.isPending ? 'Salvando...' : editingCategory ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
