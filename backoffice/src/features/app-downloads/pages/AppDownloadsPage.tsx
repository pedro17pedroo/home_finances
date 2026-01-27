import React, { useState, useEffect } from 'react';
import { Upload, Smartphone, Apple, Trash2, Save, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../../shared/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { apiClient } from '../../../shared/api/client';
import Swal from 'sweetalert2';

interface AppDownloadConfig {
  id: number;
  platform: 'android' | 'ios';
  downloadType: 'direct' | 'store';
  storeUrl: string | null;
  storeBadgeUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: string | null;
  version: string | null;
  buildNumber: string | null;
  releaseNotes: string | null;
  isActive: boolean;
  updatedAt: string;
}

export const AppDownloadsPage: React.FC = () => {
  const [androidConfig, setAndroidConfig] = useState<AppDownloadConfig | null>(null);
  const [iosConfig, setIosConfig] = useState<AppDownloadConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // Android form state
  const [androidType, setAndroidType] = useState<'direct' | 'store'>('store');
  const [androidStoreUrl, setAndroidStoreUrl] = useState('');
  const [androidVersion, setAndroidVersion] = useState('');
  const [androidBuildNumber, setAndroidBuildNumber] = useState('');
  const [androidReleaseNotes, setAndroidReleaseNotes] = useState('');
  const [androidFile, setAndroidFile] = useState<File | null>(null);
  const [androidBadge, setAndroidBadge] = useState<File | null>(null);
  const [androidActive, setAndroidActive] = useState(true);

  // iOS form state
  const [iosType, setIosType] = useState<'direct' | 'store'>('store');
  const [iosStoreUrl, setIosStoreUrl] = useState('');
  const [iosVersion, setIosVersion] = useState('');
  const [iosBuildNumber, setIosBuildNumber] = useState('');
  const [iosReleaseNotes, setIosReleaseNotes] = useState('');
  const [iosFile, setIosFile] = useState<File | null>(null);
  const [iosBadge, setIosBadge] = useState<File | null>(null);
  const [iosActive, setIosActive] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await apiClient.get('/app-downloads/public');
      const configs = response.data.data || [];

      const android = configs.find((c: AppDownloadConfig) => c.platform === 'android');
      const ios = configs.find((c: AppDownloadConfig) => c.platform === 'ios');

      if (android) {
        setAndroidConfig(android);
        setAndroidType(android.downloadType);
        setAndroidStoreUrl(android.storeUrl || '');
        setAndroidVersion(android.version || '');
        setAndroidBuildNumber(android.buildNumber || '');
        setAndroidReleaseNotes(android.releaseNotes || '');
        setAndroidActive(android.isActive);
      }

      if (ios) {
        setIosConfig(ios);
        setIosType(ios.downloadType);
        setIosStoreUrl(ios.storeUrl || '');
        setIosVersion(ios.version || '');
        setIosBuildNumber(ios.buildNumber || '');
        setIosReleaseNotes(ios.releaseNotes || '');
        setIosActive(ios.isActive);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (platform: 'android' | 'ios', newValue: boolean) => {
    if (platform === 'android') {
      setAndroidActive(newValue);
    } else {
      setIosActive(newValue);
    }

    // Save immediately
    try {
      const data = platform === 'android' ? {
        downloadType: androidType,
        storeUrl: androidStoreUrl,
        version: androidVersion,
        buildNumber: androidBuildNumber,
        releaseNotes: androidReleaseNotes,
        isActive: newValue,
      } : {
        downloadType: iosType,
        storeUrl: iosStoreUrl,
        version: iosVersion,
        buildNumber: iosBuildNumber,
        releaseNotes: iosReleaseNotes,
        isActive: newValue,
      };

      await apiClient.put(`/app-downloads/${platform}`, data);
      
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: `${platform === 'android' ? 'Android' : 'iOS'} ${newValue ? 'ativado' : 'desativado'} com sucesso!`,
        timer: 2000,
        showConfirmButton: false,
      });
      
      loadConfigs();
    } catch (error: any) {
      console.error('Error toggling active:', error);
      // Revert the toggle on error
      if (platform === 'android') {
        setAndroidActive(!newValue);
      } else {
        setIosActive(!newValue);
      }
      
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao atualizar status',
        confirmButtonColor: '#3b82f6',
      });
    }
  };

  const handleSaveConfig = async (platform: 'android' | 'ios') => {
    setSaving(platform);
    try {
      const data = platform === 'android' ? {
        downloadType: androidType,
        storeUrl: androidStoreUrl,
        version: androidVersion,
        buildNumber: androidBuildNumber,
        releaseNotes: androidReleaseNotes,
        isActive: androidActive,
      } : {
        downloadType: iosType,
        storeUrl: iosStoreUrl,
        version: iosVersion,
        buildNumber: iosBuildNumber,
        releaseNotes: iosReleaseNotes,
        isActive: iosActive,
      };

      await apiClient.put(`/app-downloads/${platform}`, data);
      
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Configuração salva com sucesso!',
        confirmButtonColor: '#3b82f6',
      });
      
      loadConfigs();
    } catch (error: any) {
      console.error('Error saving config:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao salvar configuração',
        confirmButtonColor: '#3b82f6',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleFileUpload = async (platform: 'android' | 'ios') => {
    const file = platform === 'android' ? androidFile : iosFile;
    if (!file) {
      await Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Selecione um arquivo',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    setUploading(platform);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', platform);
      formData.append('version', platform === 'android' ? androidVersion : iosVersion);
      formData.append('buildNumber', platform === 'android' ? androidBuildNumber : iosBuildNumber);
      formData.append('releaseNotes', platform === 'android' ? androidReleaseNotes : iosReleaseNotes);

      await apiClient.post(`/app-downloads/${platform}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Arquivo enviado com sucesso!',
        confirmButtonColor: '#3b82f6',
      });
      
      if (platform === 'android') {
        setAndroidFile(null);
        setAndroidType('direct');
      } else {
        setIosFile(null);
        setIosType('direct');
      }
      loadConfigs();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao fazer upload',
        confirmButtonColor: '#3b82f6',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteFile = async (platform: 'android' | 'ios') => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Confirmar exclusão',
      text: 'Tem certeza que deseja deletar o arquivo?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/app-downloads/${platform}/file`);
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Arquivo deletado com sucesso!',
        confirmButtonColor: '#3b82f6',
      });
      loadConfigs();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao deletar arquivo',
        confirmButtonColor: '#3b82f6',
      });
    }
  };

  const handleBadgeUpload = async (platform: 'android' | 'ios') => {
    const badge = platform === 'android' ? androidBadge : iosBadge;
    if (!badge) {
      await Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Selecione uma imagem',
        confirmButtonColor: '#3b82f6',
      });
      return;
    }

    setUploading(platform);
    try {
      const formData = new FormData();
      formData.append('badge', badge);

      await apiClient.post(`/app-downloads/${platform}/upload-badge`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Badge enviado com sucesso!',
        confirmButtonColor: '#3b82f6',
      });
      
      if (platform === 'android') {
        setAndroidBadge(null);
      } else {
        setIosBadge(null);
      }
      loadConfigs();
    } catch (error: any) {
      console.error('Error uploading badge:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao fazer upload do badge',
        confirmButtonColor: '#3b82f6',
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteBadge = async (platform: 'android' | 'ios') => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Confirmar exclusão',
      text: 'Tem certeza que deseja deletar o badge?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/app-downloads/${platform}/badge`);
      await Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Badge deletado com sucesso!',
        confirmButtonColor: '#3b82f6',
      });
      loadConfigs();
    } catch (error: any) {
      console.error('Error deleting badge:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: error.response?.data?.message || 'Erro ao deletar badge',
        confirmButtonColor: '#3b82f6',
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Apps Mobile">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Apps Mobile">
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie os links e arquivos de download para Android e iOS
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Android</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {androidConfig?.version || 'Não configurado'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {androidConfig?.downloadType === 'store' ? 'Google Play Store' : 'Download Direto'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Apple className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">iOS</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {iosConfig?.version || 'Não configurado'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {iosConfig?.downloadType === 'store' ? 'Apple App Store' : 'Download Direto'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Android Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Smartphone className="w-5 h-5 mr-2 text-green-600" />
                  Android
                </CardTitle>
                <label className="flex items-center cursor-pointer">
                  <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                    {androidActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={androidActive}
                      onChange={(e) => handleToggleActive('android', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-6 rounded-full transition ${androidActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${androidActive ? 'translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Download
                </label>
                <select
                  value={androidType}
                  onChange={(e) => setAndroidType(e.target.value as 'direct' | 'store')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="store">Google Play Store</option>
                  <option value="direct">Download Direto (APK)</option>
                </select>
              </div>

              {androidType === 'store' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL da Google Play Store
                    </label>
                    <Input
                      type="url"
                      value={androidStoreUrl}
                      onChange={(e) => setAndroidStoreUrl(e.target.value)}
                      placeholder="https://play.google.com/store/apps/details?id=..."
                    />
                  </div>
                  
                  {/* Store Badge Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Badge da Store (Opcional)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      onChange={(e) => setAndroidBadge(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        dark:file:bg-blue-900/30 dark:file:text-blue-400"
                    />
                    {androidConfig?.storeBadgeUrl && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <img 
                            src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${androidConfig.storeBadgeUrl}`}
                            alt="Android Badge"
                            className="h-12 object-contain"
                          />
                          <button
                            onClick={() => handleDeleteBadge('android')}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                    {androidBadge && (
                      <Button
                        onClick={() => handleBadgeUpload('android')}
                        disabled={uploading === 'android'}
                        className="w-full mt-2"
                        variant="outline"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading === 'android' ? 'Enviando...' : 'Enviar Badge'}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arquivo APK
                  </label>
                  <input
                    type="file"
                    accept=".apk,.aab"
                    onChange={(e) => setAndroidFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900/30 dark:file:text-blue-400"
                  />
                  {androidConfig?.fileUrl && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            {androidConfig.fileName}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-300">
                            {androidConfig.fileSize}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFile('android')}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Versão
                </label>
                <Input
                  type="text"
                  value={androidVersion}
                  onChange={(e) => setAndroidVersion(e.target.value)}
                  placeholder="1.0.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Build Number
                </label>
                <Input
                  type="text"
                  value={androidBuildNumber}
                  onChange={(e) => setAndroidBuildNumber(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas de Lançamento
                </label>
                <textarea
                  value={androidReleaseNotes}
                  onChange={(e) => setAndroidReleaseNotes(e.target.value)}
                  rows={3}
                  placeholder="Novidades desta versão..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="pt-2">
                {androidType === 'direct' && androidFile ? (
                  <Button
                    onClick={() => handleFileUpload('android')}
                    disabled={uploading === 'android'}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading === 'android' ? 'Enviando...' : 'Enviar Arquivo'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSaveConfig('android')}
                    disabled={saving === 'android'}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === 'android' ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* iOS Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Apple className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-300" />
                  iOS
                </CardTitle>
                <label className="flex items-center cursor-pointer">
                  <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                    {iosActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={iosActive}
                      onChange={(e) => handleToggleActive('ios', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`block w-10 h-6 rounded-full transition ${iosActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${iosActive ? 'translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Download
                </label>
                <select
                  value={iosType}
                  onChange={(e) => setIosType(e.target.value as 'direct' | 'store')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="store">Apple App Store</option>
                  <option value="direct">Download Direto (IPA)</option>
                </select>
              </div>

              {iosType === 'store' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL da Apple App Store
                    </label>
                    <Input
                      type="url"
                      value={iosStoreUrl}
                      onChange={(e) => setIosStoreUrl(e.target.value)}
                      placeholder="https://apps.apple.com/app/..."
                    />
                  </div>
                  
                  {/* Store Badge Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Badge da Store (Opcional)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      onChange={(e) => setIosBadge(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        dark:file:bg-blue-900/30 dark:file:text-blue-400"
                    />
                    {iosConfig?.storeBadgeUrl && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <img 
                            src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${iosConfig.storeBadgeUrl}`}
                            alt="iOS Badge"
                            className="h-12 object-contain"
                          />
                          <button
                            onClick={() => handleDeleteBadge('ios')}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                    {iosBadge && (
                      <Button
                        onClick={() => handleBadgeUpload('ios')}
                        disabled={uploading === 'ios'}
                        className="w-full mt-2"
                        variant="outline"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading === 'ios' ? 'Enviando...' : 'Enviar Badge'}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arquivo IPA
                  </label>
                  <input
                    type="file"
                    accept=".ipa"
                    onChange={(e) => setIosFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900/30 dark:file:text-blue-400"
                  />
                  {iosConfig?.fileUrl && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            {iosConfig.fileName}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-300">
                            {iosConfig.fileSize}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFile('ios')}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Versão
                </label>
                <Input
                  type="text"
                  value={iosVersion}
                  onChange={(e) => setIosVersion(e.target.value)}
                  placeholder="1.0.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Build Number
                </label>
                <Input
                  type="text"
                  value={iosBuildNumber}
                  onChange={(e) => setIosBuildNumber(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas de Lançamento
                </label>
                <textarea
                  value={iosReleaseNotes}
                  onChange={(e) => setIosReleaseNotes(e.target.value)}
                  rows={3}
                  placeholder="Novidades desta versão..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="pt-2">
                {iosType === 'direct' && iosFile ? (
                  <Button
                    onClick={() => handleFileUpload('ios')}
                    disabled={uploading === 'ios'}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading === 'ios' ? 'Enviando...' : 'Enviar Arquivo'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSaveConfig('ios')}
                    disabled={saving === 'ios'}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving === 'ios' ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-2">Informações Importantes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use o <strong>toggle Ativo/Inativo</strong> para controlar se a plataforma aparece na landing page</li>
                  <li>Para <strong>Google Play Store</strong> e <strong>Apple App Store</strong>, insira a URL da página do app na loja</li>
                  <li>Para <strong>Download Direto</strong>, faça upload do arquivo APK (Android) ou IPA (iOS)</li>
                  <li>Faça upload de um <strong>badge personalizado</strong> (imagem PNG/SVG) para usar o design oficial das stores</li>
                  <li>Se não enviar badge, será usado um botão padrão estilizado</li>
                  <li>Arquivos podem ter até 200MB</li>
                  <li>Certifique-se de testar os links antes de ativar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};
