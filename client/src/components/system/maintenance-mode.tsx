import { useSystemSetting } from '@/lib/system-config';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, Clock } from 'lucide-react';
import { SystemText } from './system-text';

export function MaintenanceMode({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const maintenanceMode = useSystemSetting('maintenance_mode', false);
  
  // Allow admin access during maintenance
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              <SystemText 
                configKey="maintenance_title" 
                fallback="Sistema em Manutenção" 
              />
            </h1>
            <p className="text-gray-600 mb-6">
              <SystemText 
                configKey="maintenance_message" 
                fallback="Estamos realizando melhorias no sistema. Voltaremos em breve!" 
              />
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-2" />
              <SystemText 
                configKey="maintenance_eta" 
                fallback="Tempo estimado: 30 minutos" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <>{children}</>;
}

// Hook for checking maintenance status
export function useMaintenanceStatus() {
  const maintenanceMode = useSystemSetting('maintenance_mode', false);
  const maintenanceTitle = useSystemSetting('maintenance_title', 'Sistema em Manutenção');
  const maintenanceMessage = useSystemSetting('maintenance_message', 'Estamos realizando melhorias no sistema. Voltaremos em breve!');
  const maintenanceEta = useSystemSetting('maintenance_eta', 'Tempo estimado: 30 minutos');
  
  return {
    isMaintenanceMode: maintenanceMode,
    title: maintenanceTitle,
    message: maintenanceMessage,
    eta: maintenanceEta
  };
}