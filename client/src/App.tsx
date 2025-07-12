import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import Receitas from "@/pages/receitas";
import Despesas from "@/pages/despesas";
import Poupanca from "@/pages/poupanca";
import Emprestimos from "@/pages/emprestimos";
import Relatorios from "@/pages/relatorios";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/receitas" component={Receitas} />
        <Route path="/despesas" component={Despesas} />
        <Route path="/poupanca" component={Poupanca} />
        <Route path="/emprestimos" component={Emprestimos} />
        <Route path="/relatorios" component={Relatorios} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
