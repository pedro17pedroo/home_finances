import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Crown, AlertTriangle, Menu, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { 
    label: "Transações", 
    submenu: [
      { href: "/receitas", label: "Receitas" },
      { href: "/despesas", label: "Despesas" }
    ]
  },
  { 
    label: "Financeiro", 
    submenu: [
      { href: "/poupanca", label: "Poupança" },
      { href: "/emprestimos", label: "Empréstimos" }
    ]
  },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/subscription", label: "Assinatura" },
];

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
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

  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta.",
      });
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
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
              {navItems.map((item, index) => (
                <div key={item.href || `${item.label}-${index}`} className="relative">
                  {item.href ? (
                    <Link href={item.href}>
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
                  ) : (
                    <div className="relative">
                      <button
                        className={`px-2 py-1 text-sm font-medium cursor-pointer transition-colors hover:text-primary flex items-center ${
                          item.submenu?.some(sub => location === sub.href)
                            ? "text-primary border-b-2 border-primary"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                        onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                      >
                        {item.label}
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openDropdown === item.label && item.submenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white shadow-lg border border-slate-200 rounded-md py-1 min-w-[140px] z-50">
                          {item.submenu.map((subItem, subIndex) => (
                            <Link key={`${subItem.href}-${subIndex}`} href={subItem.href}>
                              <span
                                className={`block px-3 py-2 text-sm cursor-pointer transition-colors ${
                                  location === subItem.href
                                    ? "text-primary bg-primary/10"
                                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                                onClick={() => setOpenDropdown(null)}
                              >
                                {subItem.label}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Desktop Actions - Only on larger screens */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="relative">
                <button
                  className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-400 transition-colors"
                  onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}
                >
                  <User className="h-4 w-4 text-slate-600" />
                </button>
                {openDropdown === 'user' && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white shadow-lg border border-slate-200 rounded-md py-1 z-50">
                    <Link href="/perfil">
                      <span
                        className="block px-3 py-2 text-sm cursor-pointer transition-colors text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                        onClick={() => setOpenDropdown(null)}
                      >
                        Perfil
                      </span>
                    </Link>
                    <button
                      className="block w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      onClick={() => {
                        setOpenDropdown(null);
                        handleLogout();
                      }}
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile/Tablet Menu Button - Shows on screens smaller than lg */}
            <div className="lg:hidden flex items-center space-x-2 relative">
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
                        {navItems.map((item, index) => (
                          <div key={item.href || `${item.label}-${index}`}>
                            {item.href ? (
                              <Link href={item.href}>
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
                            ) : (
                              <div>
                                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                  {item.label}
                                </div>
                                {item.submenu?.map((subItem, subIndex) => (
                                  <Link key={`${subItem.href}-${subIndex}`} href={subItem.href}>
                                    <span
                                      className={`block px-6 py-2 text-sm cursor-pointer transition-colors ${
                                        location === subItem.href
                                          ? "text-primary bg-primary/10 border-r-4 border-primary"
                                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                                      }`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      {subItem.label}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </nav>
                      <div className="px-4 py-2 border-t border-slate-100">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Minha Conta
                        </div>
                        <Link href="/perfil">
                          <span
                            className="block px-2 py-2 text-sm cursor-pointer transition-colors text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Perfil
                          </span>
                        </Link>
                        <button
                          className="block w-full text-left px-2 py-2 text-sm cursor-pointer transition-colors text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            handleLogout();
                          }}
                        >
                          Sair
                        </button>
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
        
        {/* Desktop Dropdown Overlay */}
        {openDropdown && (
          <div 
            className="fixed inset-0 z-30 hidden lg:block"
            onClick={() => setOpenDropdown(null)}
          />
        )}
      </header>


    </>
  );
}
