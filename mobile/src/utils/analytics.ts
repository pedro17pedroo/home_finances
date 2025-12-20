// Analytics service para tracking de eventos
// Pode ser integrado com Firebase Analytics, Mixpanel, etc.

interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp: number;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private isEnabled: boolean = true;

  /**
   * Registra um evento
   */
  track(eventName: string, parameters?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      parameters,
      timestamp: Date.now(),
    };

    this.events.push(event);
    
    // Em produção, enviar para o serviço de analytics
    if (__DEV__) {
      console.log('📊 Analytics Event:', event);
    }
  }

  /**
   * Eventos específicos da aplicação
   */
  trackScreenView(screenName: string): void {
    this.track('screen_view', { screen_name: screenName });
  }

  trackUserAction(action: string, category?: string): void {
    this.track('user_action', { action, category });
  }

  trackTransaction(type: 'receita' | 'despesa', amount: number, category?: string): void {
    this.track('transaction_created', { type, amount, category });
  }

  trackError(error: string, context?: string): void {
    this.track('error_occurred', { error, context });
  }

  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance_metric', { metric, value, unit });
  }

  /**
   * Controla se o analytics está habilitado
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Obtém estatísticas dos eventos
   */
  getStats(): {
    totalEvents: number;
    eventTypes: Record<string, number>;
    lastEvent?: AnalyticsEvent;
  } {
    const eventTypes = this.events.reduce((acc, event) => {
      acc[event.name] = (acc[event.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.events.length,
      eventTypes,
      lastEvent: this.events[this.events.length - 1],
    };
  }

  /**
   * Limpa os eventos armazenados
   */
  clearEvents(): void {
    this.events = [];
  }
}

export const analytics = new AnalyticsService();

// Wrapper para facilitar o uso
export const trackEvent = (name: string, params?: Record<string, any>) => {
  analytics.track(name, params);
};

export const trackScreen = (screenName: string) => {
  analytics.trackScreenView(screenName);
};

export const trackAction = (action: string, category?: string) => {
  analytics.trackUserAction(action, category);
};