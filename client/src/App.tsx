import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import Header from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import Receitas from "@/pages/receitas";
import Despesas from "@/pages/despesas";
import Poupanca from "@/pages/poupanca";
import Emprestimos from "@/pages/emprestimos";
import Relatorios from "@/pages/relatorios";
import SubscriptionPage from "@/pages/SubscriptionPage";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import Perfil from "@/pages/perfil";
import Categorias from "@/pages/categorias";
import Contas from "@/pages/contas";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/landing" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected routes with header */}
      <Route path="/dashboard">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Dashboard />
        </div>
      </Route>
      <Route path="/receitas">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Receitas />
        </div>
      </Route>
      <Route path="/despesas">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Despesas />
        </div>
      </Route>
      <Route path="/poupanca">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Poupanca />
        </div>
      </Route>
      <Route path="/emprestimos">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Emprestimos />
        </div>
      </Route>
      <Route path="/relatorios">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Relatorios />
        </div>
      </Route>
      <Route path="/subscription">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <SubscriptionPage />
        </div>
      </Route>
      <Route path="/categorias">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Categorias />
        </div>
      </Route>
      <Route path="/contas">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Contas />
        </div>
      </Route>
      <Route path="/perfil">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Perfil />
        </div>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
