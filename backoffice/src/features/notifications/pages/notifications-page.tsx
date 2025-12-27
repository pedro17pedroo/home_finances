import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, Plus, Trash2, Users, User, X } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatDate } from '../../../shared/lib/utils';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  targetType: string;
  sentAt: string;
  readCount: number;
  totalRecipients: number;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', type: 'info', targetType: 'all' });

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['admin', 'notifications'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/admin/notifications');
        return response.data;
      } catch {
        return [];
      }
    },
  });

  const sendNotification = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiClient.post('/admin/notifications', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      setIsModalOpen(false);
      setFormData({ title: '', message: '', type: 'info', targetType: 'all' });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });

  const getTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', label: 'Informação' },
      warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', label: 'Aviso' },
      promo: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Promoção' },
      alert: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'Alerta' },
    };
    const { bg, text, label } = config[type] || config.info;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  const getTargetLabel = (target: string) => {
    const labels: Record<string, string> = { all: 'Todos', basic: 'Plano Básico', premium: 'Plano Premium', trial: 'Em Teste' };
    return labels[target] || target;
  };

  return (
    <AdminLayout title="Notificações">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-gray-600 dark:text-gray-400">Envie notificações para os usuários da plataforma</p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Notificação
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications?.length || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Enviadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications?.reduce((sum, n) => sum + n.totalRecipients, 0) || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Destinatários</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <User className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {notifications?.length ? Math.round((notifications.reduce((sum, n) => sum + n.readCount, 0) / Math.max(notifications.reduce((sum, n) => sum + n.totalRecipients, 0), 1)) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de Leitura</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Histórico de Notificações</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Carregando...</div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhuma notificação enviada</div>
            ) : (
              <div className="space-y-4">
                {notifications?.map((notification) => (
                  <div key={notification.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{notification.title}</h4>
                          {getTypeBadge(notification.type)}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{notification.message}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                          <span>Enviada: {formatDate(notification.sentAt)}</span>
                          <span>Destino: {getTargetLabel(notification.targetType)}</span>
                          <span>Lida por: {notification.readCount}/{notification.totalRecipients}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteNotification.mutate(notification.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Notificação</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-gray-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); sendNotification.mutate(formData); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
                  <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 h-24" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="info">Informação</option>
                      <option value="warning">Aviso</option>
                      <option value="promo">Promoção</option>
                      <option value="alert">Alerta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destinatários</label>
                    <select value={formData.targetType} onChange={(e) => setFormData({ ...formData, targetType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="all">Todos os Usuários</option>
                      <option value="basic">Plano Básico</option>
                      <option value="premium">Plano Premium</option>
                      <option value="trial">Em Teste</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={sendNotification.isPending}>
                    <Send className="w-4 h-4 mr-2" />
                    {sendNotification.isPending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
