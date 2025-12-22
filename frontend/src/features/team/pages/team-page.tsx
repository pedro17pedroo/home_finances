import { useState } from 'react';
import { Users, UserPlus, Mail, Trash2, Shield, User, Crown, X, Loader2, Clock, Copy, Check } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import {
  useOrganization,
  useOrganizationMembers,
  useInviteMember,
  usePendingInvitations,
  useCancelInvitation,
  useRemoveMember,
  useUpdateMemberRole,
} from '../hooks/use-organization';
import { showDeleteConfirm, showSuccessToast, showErrorToast, showConfirm } from '../../../shared/lib/alerts';
import type { OrganizationMember, TeamInvitation } from '../../../shared/api/organization';

export function TeamPage() {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(organization?.id);
  const { data: invitations, isLoading: invitationsLoading } = usePendingInvitations(organization?.id);

  const inviteMemberMutation = useInviteMember();
  const cancelInvitationMutation = useCancelInvitation();
  const removeMemberMutation = useRemoveMember();
  const updateRoleMutation = useUpdateMemberRole();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      await inviteMemberMutation.mutateAsync({
        organizationId: organization.id,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      showSuccessToast('Convite enviado com sucesso!');
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao enviar convite');
    }
  };

  const handleCancelInvitation = async (invitation: TeamInvitation) => {
    const confirmed = await showDeleteConfirm('este convite');
    if (confirmed) {
      try {
        await cancelInvitationMutation.mutateAsync(invitation.id);
        showSuccessToast('Convite cancelado');
      } catch (error) {
        showErrorToast('Erro ao cancelar convite');
      }
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!organization) return;
    
    const confirmed = await showDeleteConfirm(`${member.firstName} ${member.lastName} da equipe`);
    if (confirmed) {
      try {
        await removeMemberMutation.mutateAsync({
          organizationId: organization.id,
          memberId: member.id,
        });
        showSuccessToast('Membro removido com sucesso');
      } catch (error: any) {
        showErrorToast(error.response?.data?.message || 'Erro ao remover membro');
      }
    }
  };

  const handleUpdateRole = async (member: OrganizationMember, newRole: 'admin' | 'member') => {
    if (!organization) return;

    const roleLabel = newRole === 'admin' ? 'Administrador' : 'Membro';
    const confirmed = await showConfirm(
      'Alterar Função',
      `Deseja alterar a função de ${member.firstName} para ${roleLabel}?`
    );

    if (confirmed) {
      try {
        await updateRoleMutation.mutateAsync({
          organizationId: organization.id,
          memberId: member.id,
          role: newRole,
        });
        showSuccessToast('Função atualizada com sucesso');
      } catch (error: any) {
        showErrorToast(error.response?.data?.message || 'Erro ao atualizar função');
      }
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    showSuccessToast('Link copiado!');
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      default:
        return 'Membro';
    }
  };

  const isOwner = members?.some(m => m.role === 'owner' && m.id === organization?.ownerId);
  const currentUserIsOwner = organization?.ownerId === members?.find(m => m.role === 'owner')?.id;

  if (orgLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!organization) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhuma organização encontrada
            </h2>
            <p className="text-gray-500">
              Você não pertence a nenhuma organização.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipe</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Gerencie os membros que têm acesso à sua conta
            </p>
          </div>
          <Button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Membro
          </Button>
        </div>

        {/* Organization Info */}
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              {organization.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">{members?.length || 0}</span> de{' '}
                <span className="font-medium">{organization.maxUsers}</span> membros
              </div>
              <div className="text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  organization.planType === 'premium' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    : organization.planType === 'enterprise'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  Plano {organization.planType.charAt(0).toUpperCase() + organization.planType.slice(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Membros</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {member.firstName?.charAt(0) || member.email?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email || member.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 px-3 py-1 bg-white dark:bg-gray-600 rounded-full">
                        {getRoleIcon(member.role)}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                      {member.role !== 'owner' && currentUserIsOwner && (
                        <>
                          <Select
                            value={member.role || 'member'}
                            onChange={(e) => handleUpdateRole(member, e.target.value as 'admin' | 'member')}
                            className="text-sm w-32"
                          >
                            <option value="member">Membro</option>
                            <option value="admin">Admin</option>
                          </Select>
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum membro encontrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations && invitations.length > 0 && (
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center">
                <Clock className="w-5 h-5 mr-2 text-yellow-500" />
                Convites Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {invitation.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Função: {invitation.role === 'admin' ? 'Administrador' : 'Membro'} •
                          Expira em: {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyInviteLink(invitation.token)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Copiar link do convite"
                      >
                        {copiedToken === invitation.token ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCancelInvitation(invitation)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Cancelar convite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invite Modal */}
        {showInviteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Convidar Membro
                </h2>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Envie um convite para adicionar um novo membro à sua equipe.
              </p>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Função
                  </label>
                  <Select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  >
                    <option value="member">Membro - Pode visualizar e criar transações</option>
                    <option value="admin">Administrador - Pode gerenciar membros</option>
                  </Select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteMemberMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {inviteMemberMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
