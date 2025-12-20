import NetInfo from '@react-native-community/netinfo';
import { storageService } from './storage.service';

interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private requestQueue: QueuedRequest[] = [];
  private readonly QUEUE_KEY = 'offline_request_queue';
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.initializeNetworkListener();
    this.loadQueueFromStorage();
  }

  /**
   * Inicializa o listener de conectividade
   */
  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Se voltou a ficar online, processa a fila
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });
  }

  /**
   * Carrega a fila de requisições do storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queue = await storageService.getItem<QueuedRequest[]>(this.QUEUE_KEY);
      if (queue) {
        this.requestQueue = queue;
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  /**
   * Salva a fila de requisições no storage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      await storageService.setItem(this.QUEUE_KEY, this.requestQueue);
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Adiciona uma requisição à fila offline
   */
  async queueRequest(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    headers?: Record<string, string>
  ): Promise<void> {
    const request: QueuedRequest = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      data,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.requestQueue.push(request);
    await this.saveQueueToStorage();
  }

  /**
   * Processa a fila de requisições quando volta a ficar online
   */
  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.requestQueue.length === 0) {
      return;
    }

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        await this.executeRequest(request);
        console.log(`Successfully executed queued request: ${request.id}`);
      } catch (error) {
        console.error(`Failed to execute queued request: ${request.id}`, error);
        
        // Se não excedeu o limite de tentativas, recoloca na fila
        if (request.retryCount < this.MAX_RETRIES) {
          request.retryCount++;
          this.requestQueue.push(request);
        }
      }
    }

    await this.saveQueueToStorage();
  }

  /**
   * Executa uma requisição da fila
   */
  private async executeRequest(request: QueuedRequest): Promise<any> {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body: request.data ? JSON.stringify(request.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verifica se está online
   */
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Obtém o número de requisições na fila
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Limpa a fila de requisições
   */
  async clearQueue(): Promise<void> {
    this.requestQueue = [];
    await storageService.removeItem(this.QUEUE_KEY);
  }

  /**
   * Obtém estatísticas da fila
   */
  getQueueStats(): {
    totalRequests: number;
    oldestRequest?: Date;
    newestRequest?: Date;
    methodCounts: Record<string, number>;
  } {
    if (this.requestQueue.length === 0) {
      return {
        totalRequests: 0,
        methodCounts: {},
      };
    }

    const timestamps = this.requestQueue.map(r => r.timestamp);
    const methodCounts = this.requestQueue.reduce((acc, request) => {
      acc[request.method] = (acc[request.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests: this.requestQueue.length,
      oldestRequest: new Date(Math.min(...timestamps)),
      newestRequest: new Date(Math.max(...timestamps)),
      methodCounts,
    };
  }
}

export const offlineService = new OfflineService();