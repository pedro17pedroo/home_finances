import React, { lazy, Suspense, startTransition } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import ErrorBoundary from "@/components/error-boundary";
import { MaintenanceMode } from "@/components/system/maintenance-mode";
import Header from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import Receitas from "@/pages/receitas";
import Despesas from "@/pages/despesas";
import Poupanca from "@/pages/poupanca";
import Emprestimos from "@/pages/emprestimos";
import Relatorios from "@/pages/relatorios";
import SubscriptionPage from "@/pages/SubscriptionPage";
import PaymentPage from "@/pages/PaymentPage";
import Landing from "@/pages/landing";
import PaymentConfirmationPage from "@/pages/payment-confirmation";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import Perfil from "@/pages/perfil";
import Categorias from "@/pages/categorias";
import Contas from "@/pages/contas";
import { AdminLogin, AdminDashboard, AdminUsers, AdminPlans } from "@/admin";

// Lazy load admin components with proper wrappers
const PlansWrapper = lazy(() => import('./admin/pages/plans-wrapper'));
const PaymentMethodsWrapper = lazy(() => import('./admin/pages/payment-methods-wrapper'));
const PaymentApprovalsWrapper = lazy(() => import('./admin/pages/payment-approvals-wrapper'));
const CampaignsWrapper = lazy(() => import('./admin/pages/campaigns-wrapper'));
const LandingContentWrapper = lazy(() => import('./admin/pages/landing-content-wrapper'));
const LegalContentWrapper = lazy(() => import('./admin/pages/legal-content-wrapper'));
const SystemSettingsWrapper = lazy(() => import('./admin/pages/system-settings-wrapper'));
const AdminAnalytics = lazy(() => import('./admin/pages/analytics'));
const AuditLogsWrapper = lazy(() => import('./admin/pages/audit-logs-wrapper'));
const SecurityLogsWrapper = lazy(() => import('./admin/pages/security-logs-wrapper'));

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/landing" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/payment-confirmation">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <PaymentConfirmationPage />
        </div>
      </Route>
      
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
      <Route path="/payment">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <PaymentPage />
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
      <Route path="/admin/plans">
        <Suspense fallback={<div>Carregando...</div>}>
          <PlansWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/payment-methods">
        <Suspense fallback={<div>Carregando...</div>}>
          <PaymentMethodsWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/payment-approvals">
        <Suspense fallback={<div>Carregando...</div>}>
          <PaymentApprovalsWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/campaigns">
        <Suspense fallback={<div>Carregando...</div>}>
          <CampaignsWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/landing-content">
        <Suspense fallback={<div>Carregando...</div>}>
          <LandingContentWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/legal-content">
        <Suspense fallback={<div>Carregando...</div>}>
          <LegalContentWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/system-settings">
        <Suspense fallback={<div>Carregando...</div>}>
          <SystemSettingsWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/analytics">
        <Suspense fallback={<div>Carregando...</div>}>
          <AdminAnalytics />
        </Suspense>
      </Route>
      <Route path="/admin/audit-logs">
        <Suspense fallback={<div>Carregando...</div>}>
          <AuditLogsWrapper />
        </Suspense>
      </Route>
      <Route path="/admin/security-logs">
        <Suspense fallback={<div>Carregando...</div>}>
          <SecurityLogsWrapper />
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
            <MaintenanceMode>
              <TooltipProvider>
                <Toaster />
                <ErrorBoundary>
                  <Router />
                </ErrorBoundary>
              </TooltipProvider>
            </MaintenanceMode>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
