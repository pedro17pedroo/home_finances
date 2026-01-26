import React, { useState } from 'react';
import { Button } from '../../../shared/components/ui/button';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { SelectNative as Select } from '../../../shared/components/ui/select-native';
import { showError, showSuccess } from '../../../shared/lib/alerts';

export function ExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('backup');

  const handleExport = async (type: string) => {
    setIsExporting(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      let url = '';
      
      switch (type) {
        case 'backup':
          url = '/api/export/backup';
          break;
        case 'transactions':
          url = '/api/export/transactions';
          break;
        case 'summary':
          url = '/api/export/summary';
          break;
        default:
          return;
      }

      const response = await fetch(`http://localhost:5001${url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'export.json';
        
        // Criar link de download
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        await showSuccess('Exportação Concluída', 'Seus dados foram exportados com sucesso');
      } else {
        await showError('Erro na Exportação', 'Não foi possível exportar os dados');
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      await showError('Erro na Exportação', 'Ocorreu um erro ao exportar os dados');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">💾 Exportação e Backup</h1>
        <p className="text-gray-600">Exporte seus dados financeiros ou crie backups completos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Backup Completo */}
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🗄️</div>
            <h3 className="text-lg font-semibold mb-2">Backup Completo</h3>
            <p className="text-gray-600 text-sm mb-4">
              Baixe todos os seus dados financeiros em formato JSON
            </p>
            <Button 
              onClick={() => handleExport('backup')}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? 'Exportando...' : 'Criar Backup'}
            </Button>
          </div>
        </Card>

        {/* Exportar Transações */}
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Transações CSV</h3>
            <p className="text-gray-600 text-sm mb-4">
              Exporte suas transações em formato CSV para análise
            </p>
            <Button 
              onClick={() => handleExport('transactions')}
              disabled={isExporting}
              className="w-full"
              variant="outline"
            >
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </div>
        </Card>

        {/* Relatório Resumo */}
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">Resumo Financeiro</h3>
            <p className="text-gray-600 text-sm mb-4">
              Gere um relatório resumido das suas finanças
            </p>
            <Button 
              onClick={() => handleExport('summary')}
              disabled={isExporting}
              className="w-full"
              variant="outline"
            >
              {isExporting ? 'Gerando...' : 'Gerar Resumo'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Exportação Personalizada */}
      <Card className="p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">🎛️ Exportação Personalizada</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Formato</label>
            <Select value={exportType} onChange={(e) => setExportType(e.target.value)}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Período</label>
            <Select>
              <option value="all">Todos os dados</option>
              <option value="year">Último ano</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="3months">Últimos 3 meses</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-2" />
            <span className="text-sm">Contas</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-2" />
            <span className="text-sm">Transações</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-2" />
            <span className="text-sm">Empréstimos</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-2" />
            <span className="text-sm">Dívidas</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-2" />
            <span className="text-sm">Metas</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="mr-2" />
            <span className="text-sm">Transferências</span>
          </label>
        </div>

        <Button 
          disabled={isExporting}
          className="w-full md:w-auto"
        >
          {isExporting ? 'Exportando...' : 'Exportar Dados Personalizados'}
        </Button>
      </Card>

      {/* Informações */}
      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-2 text-blue-900">ℹ️ Informações Importantes</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Os backups incluem todos os seus dados financeiros</li>
          <li>• Os arquivos CSV podem ser abertos no Excel ou Google Sheets</li>
          <li>• Seus dados são exportados de forma segura e criptografada</li>
          <li>• Recomendamos fazer backups regulares dos seus dados</li>
          <li>• Os arquivos exportados não contêm informações sensíveis como senhas</li>
        </ul>
      </Card>
    </div>
  );
}