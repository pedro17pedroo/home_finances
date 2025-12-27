import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Mail, Bell, CreditCard, Globe } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';

interface SystemSettings {
  general: { siteName: string; siteUrl: string; supportEmail: string; currency: string };
  email: { smtpHost: string; smtpPort: number; smtpUser: string; fromEmail: string; fromName: string };
  payment: { tpagamentoApiKey: string; tpagamentoUrl: string; enableEkwanza: boolean; enableGpo: boolean; enableRef: boolean };
  notifications: { enableEmailNotifications: boolean; enablePushNotifications: boolean; adminAlertEmail: string };
}

const defaultSettings: SystemSettings = {
  general: { siteName: 'FinançasPro', siteUrl: 'https://financaspro.ao', supportEmail: 'suporte@financaspro.ao', currency: 'AOA' },
  email: { smtpHost: 'smtp.example.com', smtpPort: 587, smtpUser: '', fromEmail: 'noreply@financaspro.ao', fromName: 'FinançasPro' },
  payment: { tpagamentoApiKey: '', tpagamentoUrl: 'https://tpagamento-backend.tatusolutions.com', enableEkwanza: true, enableGpo: true, enableRef: true },
  notifications: { enableEmailNotifications: true, enablePushNotifications: false, adminAlertEmail: '' },
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const { isLoading, error } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/settings');
      const data = response.data;
      const mergedSettings: SystemSettings = {
        general: { ...defaultSettings.general, ...data.general },
        email: { ...defaultSettings.email, ...data.email },
        payment: { ...defaultSettings.payment, ...data.payment },
        notifications: { ...defaultSettings.notifications, ...data.notifications },
      };
      setSettings(mergedSettings);
      return mergedSettings;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (data: SystemSettings) => {
      await apiClient.put('/admin/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setHasChanges(false);
    },
  });

  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setHasChanges(true);
  };

  const sections = [
    { id: 'general', label: 'Geral', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'payment', label: 'Pagamentos', icon: CreditCard },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];

  const renderInput = (section: keyof SystemSettings, key: string, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={(settings[section] as any)[key] || ''}
        onChange={(e) => updateSetting(section, key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  const renderToggle = (section: keyof SystemSettings, key: string, label: string) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        onClick={() => updateSetting(section, key, !(settings[section] as any)[key])}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          (settings[section] as any)[key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            (settings[section] as any)[key] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <AdminLayout title="Configurações do Sistema">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          Erro ao carregar configurações. Tente novamente.
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 shrink-0">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeSection === section.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    {sections.find((s) => s.id === activeSection)?.label}
                  </CardTitle>
                  {hasChanges && (
                    <Button onClick={() => saveSettings.mutate(settings)} disabled={saveSettings.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      {saveSettings.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeSection === 'general' && (
                  <>
                    {renderInput('general', 'siteName', 'Nome do Site')}
                    {renderInput('general', 'siteUrl', 'URL do Site')}
                    {renderInput('general', 'supportEmail', 'Email de Suporte', 'email')}
                    {renderInput('general', 'currency', 'Moeda')}
                  </>
                )}
                {activeSection === 'email' && (
                  <>
                    {renderInput('email', 'smtpHost', 'Servidor SMTP')}
                    {renderInput('email', 'smtpPort', 'Porta SMTP', 'number')}
                    {renderInput('email', 'smtpUser', 'Usuário SMTP')}
                    {renderInput('email', 'fromEmail', 'Email de Envio', 'email')}
                    {renderInput('email', 'fromName', 'Nome de Envio')}
                  </>
                )}
                {activeSection === 'payment' && (
                  <>
                    {renderInput('payment', 'tpagamentoUrl', 'URL TPagamento')}
                    {renderInput('payment', 'tpagamentoApiKey', 'API Key TPagamento')}
                    <div className="border-t dark:border-gray-700 pt-4 mt-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Métodos de Pagamento</h4>
                      {renderToggle('payment', 'enableEkwanza', 'E-Kwanza')}
                      {renderToggle('payment', 'enableGpo', 'Multicaixa Express (GPO)')}
                      {renderToggle('payment', 'enableRef', 'Referência Multicaixa')}
                    </div>
                  </>
                )}
                {activeSection === 'notifications' && (
                  <>
                    {renderToggle('notifications', 'enableEmailNotifications', 'Notificações por Email')}
                    {renderToggle('notifications', 'enablePushNotifications', 'Notificações Push')}
                    {renderInput('notifications', 'adminAlertEmail', 'Email para Alertas Admin', 'email')}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
