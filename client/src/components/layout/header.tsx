import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/dashboard">
                  <div className="flex items-center cursor-pointer">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      FinanceControl
                    </h1>
                    <div className="hidden sm:block">
                      {getSubscriptionBadge()}
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex lg:space-x-6 xl:space-x-8">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`px-1 pb-4 text-sm font-medium cursor-pointer transition-colors ${
                      location === item.href
                        ? "text-primary border-b-2 border-primary"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              <Button
                onClick={() => setIsTransactionModalOpen(true)}
                className="bg-primary hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden lg:inline">Nova Transação</span>
                <span className="lg:hidden text-xs">Nova</span>
              </Button>
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-400 transition-colors">
                <User className="h-4 w-4 text-slate-600" />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <Button
                onClick={() => setIsTransactionModalOpen(true)}
                size="sm"
                variant="outline"
                className="px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-2">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center text-left">
                      <span className="text-lg font-bold">FinanceControl</span>
                      {getSubscriptionBadge()}
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-2 mt-8">
                    {navItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={`block px-3 py-3 text-base font-medium cursor-pointer rounded-md transition-colors ${
                            location === item.href
                              ? "text-primary bg-primary/10 border-l-4 border-primary"
                              : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </nav>
                  <div className="mt-8 pt-8 border-t">
                    <div className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer">
                      <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="text-sm text-slate-600">Minha Conta</span>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
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
