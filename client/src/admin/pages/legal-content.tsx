import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Eye, History, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LegalContent, InsertLegalContent } from "@shared/schema";

const CONTENT_TYPES = [
  { value: "terms", label: "Termos de Serviço", description: "Termos e condições de uso do sistema" },
  { value: "privacy", label: "Política de Privacidade", description: "Política de tratamento de dados pessoais" },
  { value: "contacts", label: "Informações de Contato", description: "Dados de contato da empresa" },
  { value: "contracts", label: "Modelos de Contrato", description: "Templates de contratos e acordos" },
  { value: "about", label: "Sobre a Empresa", description: "Informações institucionais" },
  { value: "refund", label: "Política de Reembolso", description: "Termos e condições para reembolsos" },
];

export default function LegalContentPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<LegalContent | null>(null);
  const [previewContent, setPreviewContent] = useState<LegalContent | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();

  const { data: contents, isLoading } = useQuery({
    queryKey: ["/api/admin/legal-content"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertLegalContent) =>
      apiRequest("/api/admin/legal-content", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-content"] });
      setIsCreateOpen(false);
      toast({ title: "Conteúdo legal criado com sucesso" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LegalContent> }) =>
      apiRequest(`/api/admin/legal-content/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-content"] });
      setEditingContent(null);
      toast({ title: "Conteúdo legal atualizado com sucesso" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/admin/legal-content/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-content"] });
      toast({ title: "Status de publicação atualizado" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, isEdit = false) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      type: formData.get("type") as string,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      version: formData.get("version") as string,
      isActive: formData.get("isActive") === "on",
    };

    if (isEdit && editingContent) {
      updateMutation.mutate({ id: editingContent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTypeInfo = (type: string) => {
    return CONTENT_TYPES.find(t => t.value === type) || { label: type, description: "" };
  };

  const generateNewVersion = (currentVersion?: string) => {
    if (!currentVersion) return "1.0";
    
    const [major, minor] = currentVersion.split('.').map(Number);
    return `${major}.${minor + 1}`;
  };

  const filteredContents = contents?.filter((content: LegalContent) => 
    selectedType === "all" || content.type === selectedType
  );

  const LegalContentForm = ({ content, onSubmit, isPending }: { 
    content?: LegalContent; 
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isPending: boolean;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="type">Tipo de Conteúdo</Label>
        <Select name="type" defaultValue={content?.type}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="title">Título</Label>
        <Input 
          id="title" 
          name="title" 
          required 
          defaultValue={content?.title}
          placeholder="Termos de Serviço - FinanceControl"
        />
      </div>
      <div>
        <Label htmlFor="version">Versão</Label>
        <Input 
          id="version" 
          name="version" 
          required 
          defaultValue={content?.version || generateNewVersion(content?.version)}
          placeholder="1.0"
        />
      </div>
      <div>
        <Label htmlFor="content">Conteúdo</Label>
        <Textarea 
          id="content" 
          name="content" 
          required
          rows={15}
          defaultValue={content?.content}
          placeholder="Digite o conteúdo legal aqui..."
        />
      </div>
      <div className="flex items-center space-x-2">
        <input 
          type="checkbox" 
          id="isActive" 
          name="isActive" 
          defaultChecked={content?.isActive ?? false}
        />
        <Label htmlFor="isActive">Publicar imediatamente</Label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : content ? "Atualizar" : "Criar Conteúdo"}
      </Button>
    </form>
  );

  const ContentPreview = ({ content }: { content: LegalContent }) => (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold">{content.title}</h2>
          <Badge variant={content.isActive ? "default" : "secondary"}>
            v{content.version}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {getTypeInfo(content.type).description}
        </p>
        <p className="text-xs text-muted-foreground">
          Criado em {format(new Date(content.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      
      <ScrollArea className="h-96 w-full border rounded p-4">
        <div className="whitespace-pre-wrap text-sm">
          {content.content}
        </div>
      </ScrollArea>
    </div>
  );

  if (isLoading) {
    return <div className="p-6">Carregando conteúdo legal...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conteúdo Legal</h1>
          <p className="text-muted-foreground">
            Gerencie termos, políticas e outros documentos legais
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Documento Legal</DialogTitle>
              <DialogDescription>
                Adicione um novo documento legal ao sistema
              </DialogDescription>
            </DialogHeader>
            <LegalContentForm 
              onSubmit={(e) => handleSubmit(e, false)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          {CONTENT_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={selectedType}>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredContents?.map((content: LegalContent) => (
              <Card key={content.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{content.title}</CardTitle>
                      <CardDescription>
                        {getTypeInfo(content.type).label} v{content.version}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={content.isActive ? "default" : "secondary"}>
                        {content.isActive ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Tipo: {getTypeInfo(content.type).label}</p>
                    <p>Criado: {format(new Date(content.createdAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                    <p>Última atualização: {format(new Date(content.updatedAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <Dialog 
                        open={previewContent?.id === content.id} 
                        onOpenChange={(open) => setPreviewContent(open ? content : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Visualização do Documento</DialogTitle>
                            <DialogDescription>
                              Preview do conteúdo legal
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
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Editar Documento Legal</DialogTitle>
                            <DialogDescription>
                              Atualize o conteúdo do documento
                            </DialogDescription>
                          </DialogHeader>
                          {editingContent && (
                            <LegalContentForm 
                              content={editingContent}
                              onSubmit={(e) => handleSubmit(e, true)}
                              isPending={updateMutation.isPending}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <Button 
                      variant={content.isActive ? "secondary" : "default"}
                      size="sm"
                      onClick={() => publishMutation.mutate({ 
                        id: content.id, 
                        isActive: !content.isActive 
                      })}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {content.isActive ? "Despublicar" : "Publicar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredContents?.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum documento encontrado nesta categoria.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}