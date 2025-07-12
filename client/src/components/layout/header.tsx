import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Crown, AlertTriangle, Menu, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TransactionForm from "@/components/forms/transaction-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receitas", label: "Receitas" },
  { href: "/despesas", label: "Despesas" },
  { href: "/poupanca", label: "Poupança" },
  { href: "/emprestimos", label: "Empréstimos" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/subscription", label: "Assinatura" },
];

export default function Header() {
  const [location] = useLocation();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription/status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isTrialEnding = subscription?.trialEndsAt && 
    new Date(subscription.trialEndsAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const getSubscriptionBadge = () => {
    if (!subscription) return null;
    
    if (subscription.subscriptionStatus === "trialing") {
      return (
        <Badge variant={isTrialEnding ? "destructive" : "secondary"} className="ml-2">
          {isTrialEnding ? <AlertTriangle className="w-3 h-3 mr-1" /> : null}
          Teste
        </Badge>
      );
    }
    
    if (subscription.subscriptionStatus === "active") {
      return (
        <Badge variant="default" className="ml-2">
          <Crown className="w-3 h-3 mr-1" />
          {subscription.planType}
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/dashboard">
                  <div className="flex items-center cursor-pointer">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                      FinanceControl
                    </h1>
                    <div className="hidden sm:block">
                      {getSubscriptionBadge()}
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Desktop Navigation - Hidden on mobile and tablet */}
            <nav className="hidden lg:flex lg:space-x-4 xl:space-x-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`px-2 py-1 text-sm font-medium cursor-pointer transition-colors hover:text-primary ${
                      location === item.href
                        ? "text-primary border-b-2 border-primary"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Desktop Actions - Only on larger screens */}
            <div className="hidden lg:flex items-center space-x-3">
              <Button
                onClick={() => setIsTransactionModalOpen(true)}
                className="bg-primary hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-400 transition-colors">
                <User className="h-4 w-4 text-slate-600" />
              </div>
            </div>

            {/* Mobile/Tablet Menu Button - Shows on screens smaller than lg */}
            <div className="lg:hidden flex items-center space-x-2 relative">
              <Button
                onClick={() => setIsTransactionModalOpen(true)}
                size="sm"
                variant="outline"
                className="px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="px-2"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                
                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-md shadow-lg border border-slate-200 z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <span className="text-sm font-semibold text-slate-700">Menu</span>
                        <div className="mt-1">
                          {getSubscriptionBadge()}
                        </div>
                      </div>
                      <nav className="py-2">
                        {navItems.map((item) => (
                          <Link key={item.href} href={item.href}>
                            <span
                              className={`block px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                                location === item.href
                                  ? "text-primary bg-primary/10 border-r-4 border-primary"
                                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                              }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {item.label}
                            </span>
                          </Link>
                        ))}
                      </nav>
                      <div className="px-4 py-2 border-t border-slate-100">
                        <div className="flex items-center space-x-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer">
                          <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3 text-slate-600" />
                          </div>
                          <span className="text-sm text-slate-600">Minha Conta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </header>

      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm onSuccess={() => setIsTransactionModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
