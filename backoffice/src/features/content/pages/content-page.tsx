import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Edit, Save, X, Globe, Shield, FileCheck, Plus, Trash2, RotateCcw, Star } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
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

interface LandingSection {
  section: string;
  content: any;
  isCustom: boolean;
  id?: number;
  updatedAt?: string;
}

const contentTypes = [
  { id: 'landing', label: 'Landing Page', icon: Globe },
  { id: 'terms', label: 'Termos de Uso', icon: FileText },
  { id: 'privacy', label: 'Política de Privacidade', icon: Shield },
  { id: 'cookies', label: 'Política de Cookies', icon: FileCheck },
];

const sectionLabels: Record<string, string> = {
  hero: 'Hero (Cabeçalho)',
  features: 'Funcionalidades',
  testimonials: 'Testemunhos',
  stats: 'Estatísticas',
  cta: 'Call to Action',
  contact: 'Contacto',
  footer: 'Rodapé',
};

export function ContentPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('landing');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<any>(null);

  // Query for landing content
  const { data: landingSections, isLoading: loadingLanding } = useQuery<LandingSection[]>({
    queryKey: ['admin', 'landing-content'],
    queryFn: async () => {
      const response = await apiClient.get('/landing-content/admin/all');
      return response.data.sections || [];
    },
    enabled: activeTab === 'landing',
  });

  // Query for legal content types (terms, privacy, cookies)
  const { data: legalContents, isLoading: loadingLegal } = useQuery<ContentItem[]>({
    queryKey: ['admin', 'legal-content'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/legal-content');
      return response.data.content || [];
    },
    enabled: activeTab === 'terms' || activeTab === 'privacy' || activeTab === 'cookies',
  });

  // Query for other content types (contacts, contracts)
  const { data: contents, isLoading: loadingContent } = useQuery<ContentItem[]>({
    queryKey: ['admin', 'content', activeTab],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/admin/content/${activeTab}`);
        return response.data;
      } catch {
        return [];
      }
    },
    enabled: activeTab !== 'landing' && activeTab !== 'terms' && activeTab !== 'privacy' && activeTab !== 'cookies',
  });

  // Mutation for saving landing section
  const saveLandingSection = useMutation({
    mutationFn: async ({ section, content }: { section: string; content: any }) => {
      await apiClient.put(`/landing-content/${section}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-content'] });
      setEditingSection(null);
      setSectionContent(null);
    },
  });

  // Mutation for resetting landing section
  const resetLandingSection = useMutation({
    mutationFn: async (section: string) => {
      await apiClient.post(`/landing-content/${section}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'landing-content'] });
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

  const startEditingSection = (section: LandingSection) => {
    setEditingSection(section.section);
    setSectionContent(JSON.parse(JSON.stringify(section.content)));
  };

  const cancelEditingSection = () => {
    setEditingSection(null);
    setSectionContent(null);
  };

  const handleSaveSection = () => {
    if (editingSection && sectionContent) {
      saveLandingSection.mutate({ section: editingSection, content: sectionContent });
    }
  };

  const handleResetSection = (section: string) => {
    if (confirm('Tem certeza que deseja restaurar esta secção para o conteúdo padrão?')) {
      resetLandingSection.mutate(section);
    }
  };

  const renderSectionEditor = (section: string, content: any) => {
    switch (section) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <Input value={content.title || ''} onChange={(e) => setSectionContent({ ...content, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título Destacado</label>
              <Input value={content.titleHighlight || ''} onChange={(e) => setSectionContent({ ...content, titleHighlight: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <textarea
                value={content.subtitle || ''}
                onChange={(e) => setSectionContent({ ...content, subtitle: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Botão Primário</label>
                <Input value={content.ctaPrimary || ''} onChange={(e) => setSectionContent({ ...content, ctaPrimary: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Botão Secundário</label>
                <Input value={content.ctaSecondary || ''} onChange={(e) => setSectionContent({ ...content, ctaSecondary: e.target.value })} />
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <Input value={content.title || ''} onChange={(e) => setSectionContent({ ...content, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <Input value={content.subtitle || ''} onChange={(e) => setSectionContent({ ...content, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Funcionalidades</label>
              {content.items?.map((item: any, index: number) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg mb-3">
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ícone (emoji)</label>
                      <Input
                        value={item.icon || ''}
                        onChange={(e) => {
                          const newItems = [...content.items];
                          newItems[index] = { ...item, icon: e.target.value };
                          setSectionContent({ ...content, items: newItems });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Título</label>
                      <Input
                        value={item.title || ''}
                        onChange={(e) => {
                          const newItems = [...content.items];
                          newItems[index] = { ...item, title: e.target.value };
                          setSectionContent({ ...content, items: newItems });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                    <textarea
                      value={item.description || ''}
                      onChange={(e) => {
                        const newItems = [...content.items];
                        newItems[index] = { ...item, description: e.target.value };
                        setSectionContent({ ...content, items: newItems });
                      }}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      rows={2}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600"
                    onClick={() => {
                      const newItems = content.items.filter((_: any, i: number) => i !== index);
                      setSectionContent({ ...content, items: newItems });
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  const newItems = [...(content.items || []), { icon: '✨', title: '', description: '' }];
                  setSectionContent({ ...content, items: newItems });
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Funcionalidade
              </Button>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <Input value={content.title || ''} onChange={(e) => setSectionContent({ ...content, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <Input value={content.subtitle || ''} onChange={(e) => setSectionContent({ ...content, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Testemunhos</label>
              {content.items?.map((item: any, index: number) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg mb-3">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nome</label>
                      <Input
                        value={item.name || ''}
                        onChange={(e) => {
                          const newItems = [...content.items];
                          newItems[index] = { ...item, name: e.target.value };
                          setSectionContent({ ...content, items: newItems });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cargo/Profissão</label>
                      <Input
                        value={item.role || ''}
                        onChange={(e) => {
                          const newItems = [...content.items];
                          newItems[index] = { ...item, role: e.target.value };
                          setSectionContent({ ...content, items: newItems });
                        }}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs text-gray-500 mb-1">Avaliação (1-5)</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            const newItems = [...content.items];
                            newItems[index] = { ...item, rating: star };
                            setSectionContent({ ...content, items: newItems });
                          }}
                          className="focus:outline-none"
                        >
                          <Star className={`w-5 h-5 ${star <= (item.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Testemunho</label>
                    <textarea
                      value={item.text || ''}
                      onChange={(e) => {
                        const newItems = [...content.items];
                        newItems[index] = { ...item, text: e.target.value };
                        setSectionContent({ ...content, items: newItems });
                      }}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      rows={3}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-red-600"
                    onClick={() => {
                      const newItems = content.items.filter((_: any, i: number) => i !== index);
                      setSectionContent({ ...content, items: newItems });
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  const newItems = [...(content.items || []), { name: '', role: '', rating: 5, text: '' }];
                  setSectionContent({ ...content, items: newItems });
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Testemunho
              </Button>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Estatísticas</label>
            {content.items?.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Valor</label>
                  <Input
                    value={item.value || ''}
                    onChange={(e) => {
                      const newItems = [...content.items];
                      newItems[index] = { ...item, value: e.target.value };
                      setSectionContent({ ...content, items: newItems });
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                  <Input
                    value={item.label || ''}
                    onChange={(e) => {
                      const newItems = [...content.items];
                      newItems[index] = { ...item, label: e.target.value };
                      setSectionContent({ ...content, items: newItems });
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 mt-5"
                  onClick={() => {
                    const newItems = content.items.filter((_: any, i: number) => i !== index);
                    setSectionContent({ ...content, items: newItems });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newItems = [...(content.items || []), { value: '', label: '' }];
                setSectionContent({ ...content, items: newItems });
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar Estatística
            </Button>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <Input value={content.title || ''} onChange={(e) => setSectionContent({ ...content, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <textarea
                value={content.subtitle || ''}
                onChange={(e) => setSectionContent({ ...content, subtitle: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Botão</label>
              <Input value={content.buttonText || ''} onChange={(e) => setSectionContent({ ...content, buttonText: e.target.value })} />
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <Input value={content.title || ''} onChange={(e) => setSectionContent({ ...content, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <Input value={content.subtitle || ''} onChange={(e) => setSectionContent({ ...content, subtitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input value={content.email || ''} onChange={(e) => setSectionContent({ ...content, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <Input value={content.phone || ''} onChange={(e) => setSectionContent({ ...content, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <Input value={content.address || ''} onChange={(e) => setSectionContent({ ...content, address: e.target.value })} />
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={content.description || ''}
                onChange={(e) => setSectionContent({ ...content, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Copyright</label>
              <Input value={content.copyright || ''} onChange={(e) => setSectionContent({ ...content, copyright: e.target.value })} />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (JSON)</label>
            <textarea
              value={JSON.stringify(content, null, 2)}
              onChange={(e) => {
                try {
                  setSectionContent(JSON.parse(e.target.value));
                } catch {}
              }}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
              rows={10}
            />
          </div>
        );
    }
  };

  const isLoading = activeTab === 'landing' ? loadingLanding : 
    (activeTab === 'terms' || activeTab === 'privacy' || activeTab === 'cookies') ? loadingLegal : loadingContent;

  // Get current legal content item
  const currentLegalItem = legalContents?.find(item => item.type === activeTab);

  // State for editing legal content
  const [editingLegal, setEditingLegal] = useState(false);
  const [legalTitle, setLegalTitle] = useState('');
  const [legalContentText, setLegalContentText] = useState('');
  const [legalVersion, setLegalVersion] = useState('');

  // Mutation for saving legal content
  const saveLegalContent = useMutation({
    mutationFn: async ({ type, title, content, version }: { type: string; title: string; content: string; version: string }) => {
      await apiClient.put(`/admin/legal-content/${type}`, { title, content, version });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'legal-content'] });
      setEditingLegal(false);
    },
  });

  const startEditingLegal = (item: ContentItem) => {
    setEditingLegal(true);
    setLegalTitle(item.title);
    setLegalContentText(item.content);
    setLegalVersion(item.version);
  };

  const cancelEditingLegal = () => {
    setEditingLegal(false);
    setLegalTitle('');
    setLegalContentText('');
    setLegalVersion('');
  };

  const handleSaveLegal = () => {
    if (currentLegalItem) {
      saveLegalContent.mutate({
        type: activeTab,
        title: legalTitle,
        content: legalContentText,
        version: legalVersion,
      });
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

        {/* Landing Page Content */}
        {activeTab === 'landing' && (
          <>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <div className="space-y-4">
                {landingSections?.map((section) => (
                  <Card key={section.section}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg">{sectionLabels[section.section] || section.section}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            {section.isCustom ? (
                              <span className="text-green-600">Personalizado</span>
                            ) : (
                              <span className="text-gray-400">Conteúdo padrão</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {section.isCustom && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetSection(section.section)}
                              className="text-orange-600"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restaurar
                            </Button>
                          )}
                          {editingSection !== section.section && (
                            <Button variant="outline" size="sm" onClick={() => startEditingSection(section)}>
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editingSection === section.section ? (
                        <div className="space-y-4">
                          {renderSectionEditor(section.section, sectionContent)}
                          <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={cancelEditingSection}>
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveSection} disabled={saveLandingSection.isPending}>
                              <Save className="w-4 h-4 mr-1" />
                              {saveLandingSection.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                          <pre className="whitespace-pre-wrap font-sans">
                            {JSON.stringify(section.content, null, 2).substring(0, 500)}
                            {JSON.stringify(section.content).length > 500 && '...'}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Other Content Types */}
        {activeTab !== 'landing' && activeTab !== 'terms' && activeTab !== 'privacy' && activeTab !== 'cookies' && (
          <>
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
          </>
        )}

        {/* Legal Content (Terms, Privacy, Cookies) */}
        {(activeTab === 'terms' || activeTab === 'privacy' || activeTab === 'cookies') && (
          <>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : currentLegalItem ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{currentLegalItem.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Versão {currentLegalItem.version} • Última atualização: {new Date(currentLegalItem.updatedAt).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                    {!editingLegal && (
                      <Button variant="outline" size="sm" onClick={() => startEditingLegal(currentLegalItem)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingLegal ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                          <Input
                            value={legalTitle}
                            onChange={(e) => setLegalTitle(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Versão</label>
                          <Input
                            value={legalVersion}
                            onChange={(e) => setLegalVersion(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (HTML)</label>
                        <textarea
                          value={legalContentText}
                          onChange={(e) => setLegalContentText(e.target.value)}
                          className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={cancelEditingLegal}>
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveLegal} disabled={saveLegalContent.isPending}>
                          <Save className="w-4 h-4 mr-1" />
                          {saveLegalContent.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      <div 
                        className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700"
                        dangerouslySetInnerHTML={{ __html: currentLegalItem.content }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum conteúdo encontrado para esta secção.</p>
                  <p className="text-sm text-gray-400 mt-2">Execute a seed para criar o conteúdo inicial.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
