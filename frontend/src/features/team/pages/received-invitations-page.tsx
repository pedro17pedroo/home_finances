import { useState } from 'react';
import { Mail, Building2, Shield, Calendar, Loader2, Check, X, MailOpen } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { useAuth } from '../../../shared/contexts/auth-context';
import { useReceivedInvitations, useAcceptInvitation, useRejectInvitation } from '../hooks/use-organization';
import { showSuccessToast, showErrorToast, showConfirm, showDeleteConfirm } from '../../../shared/lib/alerts';
import type { ReceivedInvitation } from '../../../shared/api/organization';

export function ReceivedInvitationsPage() {
  const { refreshUser } = useAuth();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: invitations, isLoading, refetch } = useReceivedInvitations();
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();

  const handleAccept = async (invitation: ReceivedInvitation) => {
    const confirmed = await showConfirm(
      'Aceitar Convite',
      `Deseja juntar-se à organização "${invitation.organizationName}"?`
    );

    if (confirmed) {
      setProcessingId(invitation.id);
      try {
        await acceptMutation.mutateAsync(invitation.id);
        showSuccessToast('Convite aceite! Você agora é membro da organização.');
        await refreshUser();
        refetch();
      } catch (error: any) {
        showErrorToast(error.response?.data?.message || 'Erro ao aceitar convite');
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleReject = async (invitation: ReceivedInvitation) => {
    const confirmed = await showDeleteConfirm(`o convite para "${invitation.organizationName}"`);

    if (confirmed) {
      setProcessingId(invitation.id);
      try {
        await rejectMutation.mutateAsync(invitation.id);
        showSuccessToast('Convite rejeitado.');
        refetch();
      } catch (error: any) {
        showErrorToast(error.response?.data?.message || 'Erro ao rejeitar convite');
      } finally {
        setProcessingId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'member': return 'Membro';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Convites Recebidos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gerencie os convites que você recebeu para participar de organizações
          </p>
        </div>

        {!invitations || invitations.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <MailOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum convite pendente
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Quando alguém te convidar para uma organização, o convite aparecerá aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {invitations.length} convite{invitations.length !== 1 ? 's' : ''} pendente{invitations.length !== 1 ? 's' : ''}
            </p>

            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="bg-white dark:bg-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {invitation.organizationName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Convidado por {invitation.invitedByName}
                          </p>
                          
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                              <Shield className="w-4 h-4 mr-2 text-gray-400" />
                              Função: <span className="font-medium ml-1">{getRoleLabel(invitation.role)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              Expira em: {formatDate(invitation.expiresAt)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleReject(invitation)}
                          disabled={processingId === invitation.id}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          onClick={() => handleAccept(invitation)}
                          disabled={processingId === invitation.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {processingId === invitation.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 mr-1" />
                          )}
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
