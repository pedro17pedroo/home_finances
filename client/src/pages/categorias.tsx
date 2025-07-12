import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CategoryForm from "@/components/forms/category-form";
import type { Category } from "@shared/schema";

export default function Categorias() {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryType, setSelectedCategoryType] = useState<"receita" | "despesa">("receita");

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const receitaCategories = categories?.filter(cat => cat.type === "receita") || [];
  const despesaCategories = categories?.filter(cat => cat.type === "despesa") || [];

  const handleCreateCategory = (type: "receita" | "despesa") => {
    setSelectedCategoryType(type);
    setIsCategoryModalOpen(true);
  };

  const CategoryGrid = ({ categories, type }: { categories: Category[], type: "receita" | "despesa" }) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {type === "receita" ? "Categorias de Receitas" : "Categorias de Despesas"}
        </h3>
        <Button
          onClick={() => handleCreateCategory(type)}
          className={`${type === "receita" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova {type === "receita" ? "Receita" : "Despesa"}
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg animate-pulse">
              <div className="h-20 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">
            Nenhuma categoria de {type === "receita" ? "receita" : "despesa"} cadastrada
          </p>
          <p className="text-slate-400 mt-2">
            Crie categorias para organizar suas {type === "receita" ? "receitas" : "despesas"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <Badge 
                      variant={category.type === "receita" ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {category.type === "receita" ? "Receita" : "Despesa"}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {category.description && (
                <CardContent>
                  <p className="text-sm text-slate-600">{category.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Categorias</h1>
            <p className="text-slate-600">Gerencie suas categorias de receitas e despesas</p>
          </div>
        </div>

        <Tabs defaultValue="receitas" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="receitas" className="mt-6">
            <CategoryGrid categories={receitaCategories} type="receita" />
          </TabsContent>
          
          <TabsContent value="despesas" className="mt-6">
            <CategoryGrid categories={despesaCategories} type="despesa" />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nova Categoria de {selectedCategoryType === "receita" ? "Receita" : "Despesa"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm 
            defaultType={selectedCategoryType}
            onSuccess={() => setIsCategoryModalOpen(false)}
            onCancel={() => setIsCategoryModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}