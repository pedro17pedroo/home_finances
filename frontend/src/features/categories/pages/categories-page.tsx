import { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';

type TabType = 'receitas' | 'despesas';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  color?: string;
}

export function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('receitas');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([
    // Default categories
    { id: 1, name: 'Salário', type: 'receita', color: '#10B981' },
    { id: 2, name: 'Freelance', type: 'receita', color: '#3B82F6' },
    { id: 3, name: 'Investimentos', type: 'receita', color: '#8B5CF6' },
    { id: 4, name: 'Alimentação', type: 'despesa', color: '#EF4444' },
    { id: 5, name: 'Transporte', type: 'despesa', color: '#F59E0B' },
    { id: 6, name: 'Moradia', type: 'despesa', color: '#EC4899' },
    { id: 7, name: 'Saúde', type: 'despesa', color: '#06B6D4' },
    { id: 8, name: 'Educação', type: 'despesa', color: '#84CC16' },
    { id: 9, name: 'Lazer', type: 'despesa', color: '#F97316' },
  ]);

  const [formData, setFormData] = useState({ name: '', color: '#10B981' });

  const filteredCategories = categories.filter(
    (cat) => (activeTab === 'receitas' ? cat.type === 'receita' : cat.type === 'despesa')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      setCategories(categories.map((cat) =>
        cat.id === editingCategory.id ? { ...cat, name: formData.name, color: formData.color } : cat
      ));
      setEditingCategory(null);
    } else {
      const newCategory: Category = {
        id: Date.now(),
        name: formData.name,
        type: activeTab === 'receitas' ? 'receita' : 'despesa',
        color: formData.color,
      };
      setCategories([...categories, newCategory]);
    }
    setFormData({ name: '', color: activeTab === 'receitas' ? '#10B981' : '#EF4444' });
    setShowForm(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color || '#10B981' });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      setCategories(categories.filter((cat) => cat.id !== id));
    }
  };

  const openNewForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: activeTab === 'receitas' ? '#10B981' : '#EF4444' });
    setShowForm(true);
  };

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
                        style={{ backgroundColor: category.color }}
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
                    className={`flex-1 ${activeTab === 'receitas' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {editingCategory ? 'Salvar' : 'Criar'}
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
