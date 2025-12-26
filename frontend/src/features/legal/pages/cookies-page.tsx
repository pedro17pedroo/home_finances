import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Loader2, Cookie, Moon, Sun } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { useTheme } from '../../../shared/contexts/theme-context';

interface LegalContent {
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

export function CookiesPage() {
  const { darkMode, toggleTheme } = useTheme();
  const [content, setContent] = useState<LegalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/public/legal/cookies`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setContent(data.data);
        } else {
          setError('Conteúdo não encontrado');
        }
      } else {
        setError('Erro ao carregar conteúdo');
      }
    } catch (err) {
      console.error('Error loading cookies:', err);
      setError('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
                💰 FinanceControl
              </span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/landing">
          <Button variant="ghost" className="mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Cookie className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : content ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {content.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Versão {content.version} • Última atualização: {new Date(content.updatedAt).toLocaleDateString('pt-AO', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div 
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          © 2025 FinanceControl. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
