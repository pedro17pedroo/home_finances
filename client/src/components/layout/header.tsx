import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Crown, AlertTriangle } from "lucide-react";
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
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <div className="flex items-center cursor-pointer">
                    <h1 className="text-2xl font-bold text-slate-900">
                      FinanceControl
                    </h1>
                    {getSubscriptionBadge()}
                  </div>
                </Link>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`px-1 pb-4 text-sm font-medium ${
                        location === item.href
                          ? "text-primary border-b-2 border-primary"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {item.label}
                    </a>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setIsTransactionModalOpen(true)}
                className="bg-primary hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600" />
              </div>
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
