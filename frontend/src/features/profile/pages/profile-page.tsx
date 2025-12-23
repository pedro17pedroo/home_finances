import { useState, useEffect } from 'react';
import { User, Lock, Edit2, Building2, Loader2, Eye, EyeOff, Save, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { useAuth } from '../../../shared/contexts/auth-context';
import { useOrganization } from '../../../shared/contexts/organization-context';
import { apiClient } from '../../../shared/api/client';
import { showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { organization, isOwner, refreshOrganization } = useOrganization();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [orgFormData, setOrgFormData] = useState({
    name: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Initialize org form data when organization loads
  useEffect(() => {
    if (organization) {
      setOrgFormData({
        name: organization.name || '',
      });
    }
  }, [organization]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await apiClient.put('/auth/profile', formData);
      await refreshUser?.();
      setIsEditingProfile(false);
      showSuccessToast('Perfil atualizado com sucesso!');
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      await apiClient.put(`/organizations/${organization.id}`, orgFormData);
      await refreshOrganization();
      setIsEditingOrg(false);
      showSuccessToast('Organização atualizada com sucesso!');
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao atualizar organização');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showErrorToast('As senhas não coincidem');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showErrorToast('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccessToast('Senha alterada com sucesso!');
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const cancelEditProfile = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditingProfile(false);
  };

  const cancelEditOrg = () => {
    setOrgFormData({
      name: organization?.name || '',
    });
    setIsEditingOrg(false);
  };

  const getSubscriptionStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trialing': return 'Período de Teste';
      case 'past_due': return 'Pagamento Pendente';
      case 'canceled': return 'Cancelado';
      case 'inactive': return 'Inativo';
      default: return status || 'Inativo';
    }
  };

  const getSubscriptionStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400';
      case 'trialing': return 'text-blue-600 dark:text-blue-400';
      case 'past_due': return 'text-yellow-600 dark:text-yellow-400';
      case 'canceled': 
      case 'inactive': 
      default: return 'text-red-600 dark:text-red-400';
    }
  };

  const getPlanLabel = (planType?: string) => {
    switch (planType) {
      case 'free': return 'Teste Grátis';
      case 'basic': return 'Base';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Empresarial';
      default: return planType || 'Base';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      default: return 'Membro';
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfil</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Gerencie suas informações pessoais e configurações da conta
          </p>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Informações Pessoais */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informações Pessoais
                  </h3>
                </div>
                {user.role && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'owner' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : user.role === 'admin'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {getRoleLabel(user.role)}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Nome
                    </label>
                    {isEditingProfile ? (
                      <Input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{user.firstName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Sobrenome
                    </label>
                    {isEditingProfile ? (
                      <Input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{user.lastName || '-'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  {isEditingProfile ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white py-2">{user.email || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Telefone
                  </label>
                  {isEditingProfile ? (
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white py-2">{user.phone || '-'}</p>
                  )}
                </div>

                <div className="pt-2">
                  {isEditingProfile ? (
                    <div className="flex space-x-3">
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={cancelEditProfile} disabled={loading}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingProfile(true)}
                      className="border-gray-300 dark:border-gray-600"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar Informações
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Segurança</h3>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Mantenha sua conta segura alterando sua senha regularmente.
              </p>

              <Button
                variant="outline"
                onClick={() => setShowPasswordModal(true)}
                className="w-full border-gray-300 dark:border-gray-600"
              >
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações da Organização */}
        {organization && (
          <Card className="bg-white dark:bg-gray-800 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informações da Organização
                  </h3>
                </div>
                {isOwner && !isEditingOrg && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingOrg(true)}
                    className="border-gray-300 dark:border-gray-600"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nome da Organização</p>
                  {isEditingOrg ? (
                    <Input
                      type="text"
                      value={orgFormData.name}
                      onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">{organization.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Plano Atual</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {getPlanLabel(organization.planType)}
                  </p>
                </div>
              </div>

              {isEditingOrg && (
                <div className="flex space-x-3 mt-4">
                  <Button 
                    onClick={handleSaveOrganization} 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={cancelEditOrg} disabled={loading}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}

              {!isOwner && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  Apenas o proprietário pode editar as informações da organização.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações da Conta */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Informações da Conta
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status da Assinatura</p>
                <p className={`font-medium ${getSubscriptionStatusColor(organization?.subscriptionStatus || user.subscriptionStatus)}`}>
                  {getSubscriptionStatusLabel(organization?.subscriptionStatus || user.subscriptionStatus)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Plano Atual</p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {getPlanLabel(organization?.planType || user.planType)}
                </p>
              </div>
              {user.trialEndsAt && (organization?.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'trialing') && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Teste Termina Em</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {new Date(user.trialEndsAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Alterar Senha
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Alterar Senha
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
