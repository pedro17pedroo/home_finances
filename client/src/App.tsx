import React, { lazy, Suspense, startTransition } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import ErrorBoundary from "@/components/error-boundary";
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
import { AdminLogin, AdminDashboard, AdminUsers, AdminPlans } from "@/admin";

// Lazy load admin components
const PaymentMethodsWrapper = lazy(() => import('./admin/pages/payment-methods-wrapper'));
const AdminCampaigns = lazy(() => import('./admin/pages/campaigns'));
const AdminLandingContent = lazy(() => import('./admin/pages/landing-content'));
const AdminLegalContent = lazy(() => import('./admin/pages/legal-content'));
const AdminSystemSettings = lazy(() => import('./admin/pages/system-settings'));
const AdminAnalytics = lazy(() => import('./admin/pages/analytics'));
const AdminAuditLogs = lazy(() => import('./admin/pages/audit-logs'));
const AdminSecurityLogs = lazy(() => import('./admin/pages/security-logs'));

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
      
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/plans" component={AdminPlans} />
      <Route path="/admin/payment-methods">
        <Suspense fallback={<div>Carregando...</div>}>
          <PaymentMethodsWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/campaigns">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminCampaigns />
        </Suspense>
      </Route>
      <Route path="/admin/landing-content">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminLandingContent />
        </Suspense>
      </Route>
      <Route path="/admin/legal-content">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminLegalContent />
        </Suspense>
      </Route>
      <Route path="/admin/system-settings">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminSystemSettings />
        </Suspense>
      </Route>
      <Route path="/admin/analytics">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminAnalytics />
        </Suspense>
      </Route>
      <Route path="/admin/audit-logs">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminAuditLogs />
        </Suspense>
      </Route>
      <Route path="/admin/security-logs">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminSecurityLogs />
        </Suspense>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </TooltipProvider>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
