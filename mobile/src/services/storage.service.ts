import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in minutes
}

class StorageService {
  /**
   * Salva um item no storage
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving to storage:', error);
      throw error;
    }
  }

  /**
   * Recupera um item do storage
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  }

  /**
   * Remove um item do storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  /**
   * Limpa todo o storage
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Salva um item com cache e TTL
   */
  async setCacheItem<T>(key: string, value: T, ttlMinutes: number = 30): Promise<void> {
    const cacheItem: CacheItem<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMinutes,
    };
    
    await this.setItem(`cache_${key}`, cacheItem);
  }

  /**
   * Recupera um item do cache (verifica TTL)
   */
  async getCacheItem<T>(key: string): Promise<T | null> {
    try {
      const cacheItem = await this.getItem<CacheItem<T>>(`cache_${key}`);
      
      if (!cacheItem) {
        return null;
      }

      const now = Date.now();
      const expirationTime = cacheItem.timestamp + (cacheItem.ttl * 60 * 1000);

      if (now > expirationTime) {
        // Cache expirado, remove o item
        await this.removeItem(`cache_${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Verifica se um item do cache ainda é válido
   */
  async isCacheValid(key: string): Promise<boolean> {
    const cacheItem = await this.getCacheItem(key);
    return cacheItem !== null;
  }

  /**
   * Remove itens de cache expirados
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const cacheItem = await this.getItem<CacheItem<any>>(key);
        
        if (cacheItem) {
          const now = Date.now();
          const expirationTime = cacheItem.timestamp + (cacheItem.ttl * 60 * 1000);
          
          if (now > expirationTime) {
            await this.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  }

  /**
   * Obtém informações sobre o uso do storage
   */
  async getStorageInfo(): Promise<{
    totalKeys: number;
    cacheKeys: number;
    estimatedSize: string;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      // Estimativa simples do tamanho
      let totalSize = 0;
      for (const key of keys.slice(0, 10)) { // Amostra de 10 keys
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      const estimatedTotalSize = (totalSize / Math.min(keys.length, 10)) * keys.length;
      const sizeInKB = (estimatedTotalSize / 1024).toFixed(2);
      
      return {
        totalKeys: keys.length,
        cacheKeys: cacheKeys.length,
        estimatedSize: `${sizeInKB} KB`,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalKeys: 0,
        cacheKeys: 0,
        estimatedSize: '0 KB',
      };
    }
  }
}

export const storageService = new StorageService();