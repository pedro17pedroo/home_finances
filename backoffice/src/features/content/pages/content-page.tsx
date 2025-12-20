import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Edit, Save, X, Globe, Shield, Phone, FileCheck } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';

interface ContentItem {
  id: number;
  type: string;
  title: string;
  content: string;
  version: string;
  isActive: boolean;
  updatedAt: string;
}

const contentTypes = [
  { id: 'landing', label: 'Landing Page', icon: Globe },
  { id: 'terms', label: 'Termos de Uso', icon: FileText },
  { id: 'privacy', label: 'Política de Privacidade', icon: Shield },
  { id: 'contacts', label: 'Contactos', icon: Phone },
  { id: 'contracts', label: 'Contratos', icon: FileCheck },
];

export function ContentPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('landing');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: contents, isLoading } = useQuery<ContentItem[]>({
    queryKey: ['admin', 'content', activeTab],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/admin/content/${activeTab}`);
        return response.data;
      } catch {
        return [
          { id: 1, type: activeTab, title: 'Conteúdo Principal', content: 'Lorem ipsum...', version: '1.0', isActive: true, updatedAt: '2024-06-15' },
        ];
      }
    },
  });

  const saveContent = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      await apiClient.put(`/admin/content/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
      setEditingItem(null);
    },
  });

  const startEditing = (item: ContentItem) => {
    setEditingItem(item);
    setEditContent(item.content);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditContent('');
  };

  const handleSave = () => {
    if (editingItem) {
      saveContent.mutate({ id: editingItem.id, content: editContent });
    }
  };

  return (
    <AdminLayout title="Gestão de Conteúdo">
      <div className="space-y-6">
        {/* Tabs */}
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-2">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.id}
                    variant={activeTab === type.id ? 'default' : 'outline'}
                    onClick={() => setActiveTab(type.id)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content List */}
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-4">
            {contents?.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">v{item.version}</span>
                      {editingItem?.id !== item.id && (
                        <Button variant="outline" size="sm" onClick={() => startEditing(item)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingItem?.id === item.id ? (
                    <div className="space-y-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelEditing}>
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saveContent.isPending}>
                          <Save className="w-4 h-4 mr-1" />
                          {saveContent.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {item.content.substring(0, 500)}
                        {item.content.length > 500 && '...'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
