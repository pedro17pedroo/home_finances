import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/layout/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, Eye, AlertTriangle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminAuditLogs() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [entityType, setEntityType] = useState('all');
  const [adminUser, setAdminUser] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs', search, action, entityType, adminUser, page],
    queryFn: () => {
      const params = new URLSearchParams({
        search,
        action: action === 'all' ? '' : action,
        entityType: entityType === 'all' ? '' : entityType,
        adminUser: adminUser === 'all' ? '' : adminUser,
        page: page.toString(),
        limit: '50'
      });
      return fetch(`/api/admin/audit-logs?${params}`).then(res => res.json());
    },
    throwOnError: false,
  });

  const { data: filtersData } = useQuery({
    queryKey: ['/api/admin/audit-logs/filters'],
    queryFn: () => fetch('/api/admin/audit-logs/filters').then(res => res.json()),
    throwOnError: false,
  });

  const exportLogs = () => {
    const params = new URLSearchParams({
      search,
      action: action === 'all' ? '' : action,
      entityType: entityType === 'all' ? '' : entityType,
      adminUser: adminUser === 'all' ? '' : adminUser,
      format: 'csv'
    });
    window.open(`/api/admin/audit-logs/export?${params}`, '_blank');
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'delete':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'login':
      case 'logout':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
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
            <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
            <p className="text-muted-foreground">
              Histórico completo de ações administrativas e eventos de segurança
            </p>
          </div>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pesquisar</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="IP, User Agent, Entidade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {filtersData?.actions?.map((act: string) => (
                      <SelectItem key={act} value={act}>{act}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Entidade</label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {filtersData?.entityTypes?.map((type: string) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Administrador</label>
                <Select value={adminUser} onValueChange={setAdminUser}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filtersData?.adminUsers?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ações</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearch('');
                    setAction('all');
                    setEntityType('all');
                    setAdminUser('all');
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

        {/* Lista de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Atividade</CardTitle>
            <CardDescription>
              {logsData?.totalCount || 0} entradas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logsData?.logs?.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    {getSeverityIcon(log.action)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-sm text-muted-foreground">#{log.entityId}</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.adminUser?.firstName} {log.adminUser?.lastName} ({log.adminUser?.email})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')} • 
                        IP: {log.ipAddress} • 
                        {log.userAgent?.substring(0, 50)}...
                      </div>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Detalhes do Log #{log.id}</DialogTitle>
                        <DialogDescription>
                          {log.action} em {log.entityType} por {log.adminUser?.firstName} {log.adminUser?.lastName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Informações Gerais</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Data:</strong> {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}</div>
                              <div><strong>Ação:</strong> {log.action}</div>
                              <div><strong>Entidade:</strong> {log.entityType} #{log.entityId}</div>
                              <div><strong>Admin:</strong> {log.adminUser?.firstName} {log.adminUser?.lastName}</div>
                              <div><strong>Email:</strong> {log.adminUser?.email}</div>
                              <div><strong>IP:</strong> {log.ipAddress}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">User Agent</h4>
                            <div className="text-sm text-muted-foreground">
                              {log.userAgent}
                            </div>
                          </div>
                        </div>

                        {(log.oldData || log.newData) && (
                          <div className="space-y-4">
                            {log.oldData && (
                              <div>
                                <h4 className="font-medium mb-2">Dados Anteriores</h4>
                                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.oldData, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newData && (
                              <div>
                                <h4 className="font-medium mb-2">Novos Dados</h4>
                                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.newData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}

              {logsData?.logs?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado com os filtros aplicados
                </div>
              )}
            </div>

            {/* Paginação */}
            {logsData?.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {logsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === logsData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}