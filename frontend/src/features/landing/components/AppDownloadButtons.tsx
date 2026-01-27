import React, { useState, useEffect } from 'react';
import { Smartphone, Apple, Download, ExternalLink } from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';

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
}

export function AppDownloadButtons() {
  const [configs, setConfigs] = useState<AppDownloadConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/app-downloads/public`);
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading app download configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const androidConfig = configs.find((c) => c.platform === 'android' && c.isActive);
  const iosConfig = configs.find((c) => c.platform === 'ios' && c.isActive);

  if (loading || (!androidConfig && !iosConfig)) {
    return null;
  }

  const handleDownload = (config: AppDownloadConfig) => {
    if (config.downloadType === 'store' && config.storeUrl) {
      window.open(config.storeUrl, '_blank');
    } else if (config.downloadType === 'direct' && config.fileUrl) {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const baseUrl = apiUrl.replace('/api', '');
      window.open(`${baseUrl}${config.fileUrl}`, '_blank');
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Baixe o Aplicativo Mobile
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Gerencie suas finanças em qualquer lugar, a qualquer momento
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
          {/* Android Button */}
          {androidConfig && (
            <div className="w-full sm:w-auto">
              {androidConfig.storeBadgeUrl ? (
                /* Custom Badge */
                <a
                  href={androidConfig.downloadType === 'store' ? androidConfig.storeUrl! : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${androidConfig.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-80 transition-opacity"
                >
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${androidConfig.storeBadgeUrl}`}
                    alt="Disponível no Google Play"
                    className="h-14 sm:h-16 object-contain"
                  />
                </a>
              ) : (
                /* Default Button */
                <Button
                  onClick={() => handleDownload(androidConfig)}
                  size="lg"
                  className="w-full sm:w-auto px-8 py-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center">
                    <Smartphone className="w-8 h-8 mr-3" />
                    <div className="text-left">
                      <div className="text-xs opacity-90">Disponível no</div>
                      <div className="text-lg font-bold flex items-center">
                        {androidConfig.downloadType === 'store' ? 'Google Play' : 'Download APK'}
                        {androidConfig.downloadType === 'store' ? (
                          <ExternalLink className="w-4 h-4 ml-2" />
                        ) : (
                          <Download className="w-4 h-4 ml-2" />
                        )}
                      </div>
                      {androidConfig.version && (
                        <div className="text-xs opacity-75">v{androidConfig.version}</div>
                      )}
                    </div>
                  </div>
                </Button>
              )}
              {androidConfig.downloadType === 'direct' && androidConfig.fileSize && !androidConfig.storeBadgeUrl && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  Tamanho: {androidConfig.fileSize}
                </p>
              )}
            </div>
          )}

          {/* iOS Button */}
          {iosConfig && (
            <div className="w-full sm:w-auto">
              {iosConfig.storeBadgeUrl ? (
                /* Custom Badge */
                <a
                  href={iosConfig.downloadType === 'store' ? iosConfig.storeUrl! : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${iosConfig.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-80 transition-opacity"
                >
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${iosConfig.storeBadgeUrl}`}
                    alt="Disponível na App Store"
                    className="h-14 sm:h-16 object-contain"
                  />
                </a>
              ) : (
                /* Default Button */
                <Button
                  onClick={() => handleDownload(iosConfig)}
                  size="lg"
                  className="w-full sm:w-auto px-8 py-6 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center">
                    <Apple className="w-8 h-8 mr-3" />
                    <div className="text-left">
                      <div className="text-xs opacity-90">Disponível na</div>
                      <div className="text-lg font-bold flex items-center">
                        {iosConfig.downloadType === 'store' ? 'App Store' : 'Download IPA'}
                        {iosConfig.downloadType === 'store' ? (
                          <ExternalLink className="w-4 h-4 ml-2" />
                        ) : (
                          <Download className="w-4 h-4 ml-2" />
                        )}
                      </div>
                      {iosConfig.version && (
                        <div className="text-xs opacity-75">v{iosConfig.version}</div>
                      )}
                    </div>
                  </div>
                </Button>
              )}
              {iosConfig.downloadType === 'direct' && iosConfig.fileSize && !iosConfig.storeBadgeUrl && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  Tamanho: {iosConfig.fileSize}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Release Notes */}
        {(androidConfig?.releaseNotes || iosConfig?.releaseNotes) && (
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Novidades da Versão
              </h3>
              <div className="space-y-4">
                {androidConfig?.releaseNotes && (
                  <div>
                    <div className="flex items-center mb-2">
                      <Smartphone className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Android {androidConfig.version}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
                      {androidConfig.releaseNotes}
                    </p>
                  </div>
                )}
                {iosConfig?.releaseNotes && (
                  <div>
                    <div className="flex items-center mb-2">
                      <Apple className="w-5 h-5 text-gray-700 dark:text-gray-300 mr-2" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        iOS {iosConfig.version}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">
                      {iosConfig.releaseNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
