import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Shield, AlertTriangle, Activity, Eye, Ban, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminSecurityLogs() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [page, setPage] = useState(1);

  const { data: securityData, isLoading } = useQuery({
    queryKey: ['/api/admin/security-logs', search, severity, eventType, page],
    queryFn: () => {
      const params = new URLSearchParams({
        search,
        severity: severity === 'all' ? '' : severity,
        eventType: eventType === 'all' ? '' : eventType,
        page: page.toString(),
        limit: '50'
      });
      return fetch(`/api/admin/security-logs?${params}`).then(res => res.json());
    }
  });

  const { data: securityStats } = useQuery({
    queryKey: ['/api/admin/security-stats'],
    queryFn: () => fetch('/api/admin/security-stats').then(res => res.json())
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const blockIP = async (ip: string) => {
    try {
      await fetch('/api/admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Logs de Segurança</h1>
            <p className="text-muted-foreground">
              Monitoramento de eventos de segurança e tentativas de intrusão
            </p>
          </div>
        </div>

        {/* Estatísticas de Segurança */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tentativas de Login Falhadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {securityStats?.failedLogins24h || 0}
              </div>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IPs Bloqueados</CardTitle>
              <Ban className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {securityStats?.blockedIPs || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total ativo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ataques Detectados</CardTitle>
              <Shield className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {securityStats?.attacks24h || 0}
              </div>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score de Segurança</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {securityStats?.securityScore || 95}%
              </div>
              <p className="text-xs text-muted-foreground">Excelente</p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas de Segurança Críticos */}
        {securityStats?.criticalAlerts?.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Alertas Críticos:</strong> {securityStats.criticalAlerts.length} eventos críticos 
              requerem atenção imediata. Verifique os logs abaixo.
            </AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pesquisar</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="IP, User Agent, Evento..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Severidade</label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Evento</label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="failed_login">Login Falhado</SelectItem>
                    <SelectItem value="brute_force">Força Bruta</SelectItem>
                    <SelectItem value="sql_injection">SQL Injection</SelectItem>
                    <SelectItem value="xss_attempt">Tentativa XSS</SelectItem>
                    <SelectItem value="rate_limit">Rate Limit</SelectItem>
                    <SelectItem value="suspicious_activity">Atividade Suspeita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ações</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearch('');
                    setSeverity('all');
                    setEventType('all');
                    setPage(1);
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Eventos de Segurança */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos de Segurança</CardTitle>
            <CardDescription>
              {securityData?.totalCount || 0} eventos encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityData?.events?.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    {getSeverityIcon(event.severity)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{event.eventType}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{event.ipAddress}</span>
                        {event.location && (
                          <>
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{event.location}</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm font-medium">{event.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm:ss')} • 
                        User Agent: {event.userAgent?.substring(0, 80)}...
                      </div>
                      {event.details && (
                        <div className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          <strong>Detalhes:</strong> {event.details}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {event.severity === 'critical' || event.severity === 'high' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => blockIP(event.ipAddress)}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Bloquear IP
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {securityData?.events?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum evento de segurança encontrado com os filtros aplicados
                </div>
              )}
            </div>

            {/* Paginação */}
            {securityData?.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {securityData.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === securityData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IPs Bloqueados */}
        {securityStats?.recentBlockedIPs?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>IPs Recentemente Bloqueados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {securityStats.recentBlockedIPs.map((ip: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded">
                    <div className="flex items-center space-x-3">
                      <Ban className="h-4 w-4 text-red-600" />
                      <div>
                        <span className="font-medium">{ip.address}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          Bloqueado em {format(new Date(ip.blockedAt), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <Badge variant="destructive">{ip.reason}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}