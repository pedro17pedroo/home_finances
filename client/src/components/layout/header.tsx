import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";
import { useState } from "react";
import TransactionForm from "@/components/forms/transaction-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receitas", label: "Receitas" },
  { href: "/despesas", label: "Despesas" },
  { href: "/poupanca", label: "Poupança" },
  { href: "/emprestimos", label: "Empréstimos" },
  { href: "/relatorios", label: "Relatórios" },
];

export default function Header() {
  const [location] = useLocation();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <h1 className="text-2xl font-bold text-slate-900 cursor-pointer">
                    FinanceControl
                  </h1>
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
