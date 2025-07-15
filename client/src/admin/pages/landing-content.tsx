import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LandingContent, InsertLandingContent } from "@shared/schema";

const SECTION_TYPES = [
  { value: "hero", label: "Seção Hero", description: "Banner principal da página" },
  { value: "features", label: "Funcionalidades", description: "Lista de recursos do sistema" },
  { value: "testimonials", label: "Testemunhos", description: "Depoimentos de clientes" },
  { value: "pricing", label: "Preços", description: "Informações de preços" },
  { value: "faq", label: "FAQ", description: "Perguntas frequentes" },
  { value: "about", label: "Sobre", description: "Informações sobre a empresa" },
];

export default function LandingContentPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<LandingContent | null>(null);
  const [previewContent, setPreviewContent] = useState<LandingContent | null>(null);
  const { toast } = useToast();

  const { data: contents, isLoading } = useQuery({
    queryKey: ["/api/admin/landing-content"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertLandingContent) =>
      apiRequest("/api/admin/landing-content", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-content"] });
      setIsCreateOpen(false);
      toast({ title: "Conteúdo criado com sucesso" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LandingContent> }) =>
      apiRequest(`/api/admin/landing-content/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-content"] });
      setEditingContent(null);
      toast({ title: "Conteúdo atualizado com sucesso" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/landing-content/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-content"] });
      toast({ title: "Conteúdo removido com sucesso" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const contentText = formData.get("content") as string;
    let parsedContent = {};
    
    try {
      parsedContent = JSON.parse(contentText);
    } catch (error) {
      toast({ title: "Conteúdo JSON inválido", variant: "destructive" });
      return;
    }

    const data = {
      section: formData.get("section") as string,
      content: parsedContent,
      isActive: formData.get("isActive") === "on",
    };

    if (isEdit && editingContent) {
      updateMutation.mutate({ id: editingContent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSectionInfo = (section: string) => {
    return SECTION_TYPES.find(s => s.value === section) || { label: section, description: "" };
  };

  const formatContent = (content: any) => {
    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  };

  const ContentForm = ({ content, onSubmit, isPending }: { 
    content?: LandingContent; 
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isPending: boolean;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="section">Seção</Label>
        <Select name="section" defaultValue={content?.section}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a seção" />
          </SelectTrigger>
          <SelectContent>
            {SECTION_TYPES.map((section) => (
              <SelectItem key={section.value} value={section.value}>
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="content">Conteúdo (JSON)</Label>
        <Textarea 
          id="content" 
          name="content" 
          required
          rows={12}
          defaultValue={content ? formatContent(content.content) : ""}
          placeholder={`{
  "title": "Título da seção",
  "subtitle": "Subtítulo",
  "description": "Descrição detalhada",
  "buttons": [
    {"text": "Botão 1", "link": "/registro"}
  ]
}`}
        />
      </div>
      <div className="flex items-center space-x-2">
        <input 
          type="checkbox" 
          id="isActive" 
          name="isActive" 
          defaultChecked={content?.isActive ?? true}
        />
        <Label htmlFor="isActive">Ativo</Label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : content ? "Atualizar" : "Criar Conteúdo"}
      </Button>
    </form>
  );

  const ContentPreview = ({ content }: { content: LandingContent }) => {
    const data = content.content as any;
    
    return (
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="font-semibold">{getSectionInfo(content.section).label}</h3>
          <p className="text-sm text-muted-foreground">
            {getSectionInfo(content.section).description}
          </p>
        </div>
        
        {data.title && (
          <div>
            <h4 className="font-medium">Título</h4>
            <p className="text-sm">{data.title}</p>
          </div>
        )}
        
        {data.subtitle && (
          <div>
            <h4 className="font-medium">Subtítulo</h4>
            <p className="text-sm">{data.subtitle}</p>
          </div>
        )}
        
        {data.description && (
          <div>
            <h4 className="font-medium">Descrição</h4>
            <p className="text-sm">{data.description}</p>
          </div>
        )}
        
        {data.buttons && Array.isArray(data.buttons) && (
          <div>
            <h4 className="font-medium">Botões</h4>
            <div className="space-y-1">
              {data.buttons.map((btn: any, index: number) => (
                <div key={index} className="text-sm bg-muted p-2 rounded">
                  {btn.text} → {btn.link}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.features && Array.isArray(data.features) && (
          <div>
            <h4 className="font-medium">Funcionalidades</h4>
            <div className="space-y-1">
              {data.features.map((feature: any, index: number) => (
                <div key={index} className="text-sm bg-muted p-2 rounded">
                  {feature.title}: {feature.description}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-6">Carregando conteúdo...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conteúdo da Landing Page</h1>
          <p className="text-muted-foreground">
            Gerencie o conteúdo das seções da página inicial
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Conteúdo</DialogTitle>
              <DialogDescription>
                Adicione uma nova seção de conteúdo para a landing page
              </DialogDescription>
            </DialogHeader>
            <ContentForm 
              onSubmit={(e) => handleSubmit(e, false)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {contents?.map((content: LandingContent) => (
          <Card key={content.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {getSectionInfo(content.section).label}
                  </CardTitle>
                  <CardDescription>
                    {getSectionInfo(content.section).description}
                  </CardDescription>
                </div>
                <Badge variant={content.isActive ? "default" : "secondary"}>
                  {content.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Seção: <span className="font-mono">{content.section}</span>
              </div>
              
              <div className="flex space-x-2">
                <Dialog 
                  open={previewContent?.id === content.id} 
                  onOpenChange={(open) => setPreviewContent(open ? content : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Preview do Conteúdo</DialogTitle>
                      <DialogDescription>
                        Visualização da seção {getSectionInfo(content.section).label}
                      </DialogDescription>
                    </DialogHeader>
                    {previewContent && <ContentPreview content={previewContent} />}
                  </DialogContent>
                </Dialog>
                
                <Dialog 
                  open={editingContent?.id === content.id} 
                  onOpenChange={(open) => setEditingContent(open ? content : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Editar Conteúdo</DialogTitle>
                      <DialogDescription>
                        Atualize o conteúdo da seção {getSectionInfo(content.section).label}
                      </DialogDescription>
                    </DialogHeader>
                    {editingContent && (
                      <ContentForm 
                        content={editingContent}
                        onSubmit={(e) => handleSubmit(e, true)}
                        isPending={updateMutation.isPending}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => deleteMutation.mutate(content.id)}
              >
                <X className="mr-2 h-4 w-4" />
                Remover
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {contents?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum conteúdo criado ainda.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}