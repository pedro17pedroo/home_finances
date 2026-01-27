import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Eye,
  XCircle,
  MapPin,
  FileText,
  User,
} from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { apiClient } from '../../../shared/api/client';
import { formatDate } from '../../../shared/lib/utils';

interface SecurityEvent {
  id: number;
  eventType: string;
  severity: string;
  description: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  isResolved: boolean;
  createdAt: string;
}

interface BlockedIP {
  id: number;
  ipAddress: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface AuditLog {
  id: number;
  adminUserId: number | null;
  adminEmail?: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  oldData: any;
  newData: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function SecurityPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'events' | 'blocked' | 'logs'>('events');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const logsLimit = 50;

  const { data: events } = useQuery<SecurityEvent[]>({
    queryKey: ['admin', 'security', 'events'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/admin/security/events');
        return response.data;
      } catch {
        return [
          { id: 1, eventType: 'failed_login', severity: 'medium', description: 'Múltiplas tentativas de login falhadas', ipAddress: '192.168.1.100', location: 'Luanda, AO', userAgent: 'Chrome/120', isResolved: false, createdAt: '2024-06-15T10:30:00' },
          { id: 2, eventType: 'brute_force', severity: 'high', description: 'Ataque de força bruta detectado', ipAddress: '10.0.0.50', location: 'Unknown', userAgent: 'Bot', isResolved: true, createdAt: '2024-06-14T08:15:00' },
          { id: 3, eventType: 'suspicious_activity', severity: 'low', description: 'Atividade suspeita detectada', ipAddress: '172.16.0.25', location: 'Benguela, AO', userAgent: 'Firefox/119', isResolved: false, createdAt: '2024-06-13T14:45:00' },
        ];
      }
    },
  });

  const { data: blockedIPs } = useQuery<BlockedIP[]>({
    queryKey: ['admin', 'security', 'blocked'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/admin/security/blocked-ips');
        return response.data;
      } catch {
        return [
          { id: 1, ipAddress: '10.0.0.50', reason: 'Ataque de força bruta', isActive: true, createdAt: '2024-06-14T08:20:00', expiresAt: null },
          { id: 2, ipAddress: '192.168.100.200', reason: 'Atividade maliciosa', isActive: true, createdAt: '2024-06-10T12:00:00', expiresAt: '2024-07-10T12:00:00' },
        ];
      }
    },
  });

  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ['admin', 'audit-logs', logsPage],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/audit-logs?page=${logsPage}&limit=${logsLimit}`);
      console.log('Audit logs response:', response.data);
      return response.data.data.logs;
    },
  });

  const resolveEvent = useMutation({
    mutationFn: async (eventId: number) => {
      await apiClient.post(`/admin/security/events/${eventId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'events'] });
      setSelectedEvent(null);
    },
  });

  const unblockIP = useMutation({
    mutationFn: async (ipId: number) => {
      await apiClient.delete(`/admin/security/blocked-ips/${ipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'blocked'] });
    },
  });

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400' },
      medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400' },
      high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-400' },
      critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400' },
    };
    const { bg, text } = config[severity] || config.low;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{severity.toUpperCase()}</span>;
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      failed_login: 'Login Falhado',
      brute_force: 'Força Bruta',
      suspicious_activity: 'Atividade Suspeita',
      ip_blocked: 'IP Bloqueado',
      account_locked: 'Conta Bloqueada',
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'admin.login': 'Login Admin',
      'admin.create': 'Criar Admin',
      'admin.update': 'Atualizar Admin',
      'admin.delete': 'Eliminar Admin',
      'user.create': 'Criar Utilizador',
      'user.update': 'Atualizar Utilizador',
      'user.delete': 'Eliminar Utilizador',
      'plan.create': 'Criar Plano',
      'plan.update': 'Atualizar Plano',
      'plan.delete': 'Eliminar Plano',
      'payment.approve': 'Aprovar Pagamento',
      'payment.reject': 'Rejeitar Pagamento',
      'settings.update': 'Atualizar Configurações',
      'content.update': 'Atualizar Conteúdo',
      'security.resolve': 'Resolver Evento',
      'ip.block': 'Bloquear IP',
      'ip.unblock': 'Desbloquear IP',
    };
    return labels[action] || action;
  };

  const totalPages = auditLogs ? Math.ceil(auditLogs.total / logsLimit) : 1;

  return (
    <AdminLayout title="Segurança">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events?.filter((e) => !e.isResolved).length || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Eventos Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Ban className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{blockedIPs?.filter((ip) => ip.isActive).length || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">IPs Bloqueados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events?.filter((e) => e.isResolved).length || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Eventos Resolvidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events?.filter((e) => e.severity === 'critical' || e.severity === 'high').length || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alta Severidade</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={activeTab === 'events' ? 'default' : 'outline'} onClick={() => setActiveTab('events')}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Eventos de Segurança
          </Button>
          <Button variant={activeTab === 'blocked' ? 'default' : 'outline'} onClick={() => setActiveTab('blocked')}>
            <Ban className="w-4 h-4 mr-2" />
            IPs Bloqueados
          </Button>
          <Button variant={activeTab === 'logs' ? 'default' : 'outline'} onClick={() => setActiveTab('logs')}>
            <FileText className="w-4 h-4 mr-2" />
            Logs do Sistema
          </Button>
        </div>

        {/* Events Table */}
        {activeTab === 'events' && (
          <Card>
            <CardHeader><CardTitle className="text-gray-900 dark:text-white">Eventos de Segurança</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Severidade</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">IP</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Localização</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events?.map((event) => (
                      <tr key={event.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{getEventTypeLabel(event.eventType)}</td>
                        <td className="py-3 px-4">{getSeverityBadge(event.severity)}</td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-600 dark:text-gray-300">{event.ipAddress}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300"><div className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-gray-400" />{event.location}</div></td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(event.createdAt)}</td>
                        <td className="py-3 px-4">{event.isResolved ? <span className="text-green-600 dark:text-green-400 flex items-center"><CheckCircle className="w-4 h-4 mr-1" />Resolvido</span> : <span className="text-yellow-600 dark:text-yellow-400 flex items-center"><Clock className="w-4 h-4 mr-1" />Pendente</span>}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => setSelectedEvent(event)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"><Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
                            {!event.isResolved && <button onClick={() => resolveEvent.mutate(event.id)} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blocked IPs Table */}
        {activeTab === 'blocked' && (
          <Card>
            <CardHeader><CardTitle className="text-gray-900 dark:text-white">IPs Bloqueados</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">IP</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Motivo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Bloqueado em</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Expira em</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIPs?.map((ip) => (
                      <tr key={ip.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 font-mono text-gray-900 dark:text-white">{ip.ipAddress}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{ip.reason}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{formatDate(ip.createdAt)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{ip.expiresAt ? formatDate(ip.expiresAt) : 'Permanente'}</td>
                        <td className="py-3 px-4">
                          <Button variant="outline" size="sm" onClick={() => unblockIP.mutate(ip.id)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Desbloquear
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Logs Table */}
        {activeTab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Logs do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Data/Hora</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Admin</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ação</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Entidade</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">IP</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLogs ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          A carregar logs...
                        </td>
                      </tr>
                    ) : !auditLogs?.logs || auditLogs.logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          Nenhum log encontrado
                        </td>
                      </tr>
                    ) : (
                      auditLogs.logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1 text-gray-400" />
                            {log.adminEmail || `Admin #${log.adminUserId || 'Sistema'}`}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{getActionLabel(log.action)}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {log.entityType && log.entityId ? (
                            <span className="text-sm">
                              {log.entityType} #{log.entityId}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-600 dark:text-gray-300">{log.ipAddress || '-'}</td>
                        <td className="py-3 px-4">
                          <button onClick={() => setSelectedLog(log)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {auditLogs && auditLogs.total > logsLimit && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {((logsPage - 1) * logsLimit) + 1} - {Math.min(logsPage * logsLimit, auditLogs.total)} de {auditLogs.total} registos
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
                      Página {logsPage} de {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsPage(p => Math.min(totalPages, p + 1))}
                      disabled={logsPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes do Evento</h3>
                <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><XCircle className="w-6 h-6" /></button>
              </div>
              <div className="space-y-3">
                <div><span className="text-gray-500 dark:text-gray-400">Tipo:</span> <span className="font-medium text-gray-900 dark:text-white">{getEventTypeLabel(selectedEvent.eventType)}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Severidade:</span> {getSeverityBadge(selectedEvent.severity)}</div>
                <div><span className="text-gray-500 dark:text-gray-400">Descrição:</span> <p className="mt-1 text-gray-900 dark:text-white">{selectedEvent.description}</p></div>
                <div><span className="text-gray-500 dark:text-gray-400">IP:</span> <span className="font-mono text-gray-900 dark:text-white">{selectedEvent.ipAddress}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Localização:</span> <span className="text-gray-900 dark:text-white">{selectedEvent.location}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">User Agent:</span> <span className="text-sm text-gray-600 dark:text-gray-300">{selectedEvent.userAgent}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400">Data:</span> <span className="text-gray-900 dark:text-white">{formatDate(selectedEvent.createdAt)}</span></div>
              </div>
              {!selectedEvent.isResolved && (
                <div className="mt-6">
                  <Button onClick={() => resolveEvent.mutate(selectedEvent.id)} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Resolvido
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes do Log</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Data/Hora:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Administrador:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedLog.adminEmail || `Admin #${selectedLog.adminUserId || 'Sistema'}`}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Ação:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{getActionLabel(selectedLog.action)}</p>
                </div>
                {selectedLog.entityType && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Entidade:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedLog.entityType} #{selectedLog.entityId}</p>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Endereço IP:</span>
                    <p className="font-mono text-gray-900 dark:text-white">{selectedLog.ipAddress}</p>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">User Agent:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 break-all">{selectedLog.userAgent}</p>
                  </div>
                )}
                {selectedLog.oldData && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Dados Anteriores:</span>
                    <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto text-gray-900 dark:text-white">
                      {JSON.stringify(selectedLog.oldData, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newData && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Dados Novos:</span>
                    <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto text-gray-900 dark:text-white">
                      {JSON.stringify(selectedLog.newData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
