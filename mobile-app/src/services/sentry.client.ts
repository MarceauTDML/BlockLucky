export interface SentryEventReport {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  canRetry?: boolean;
}

class SentryClient {
  private logs: SentryEventReport[] = [];

  public init(): void {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (dsn) {
      this.captureBreadcrumb('Sentry initialized for BlockLucky Mobile');
    }
  }

  public captureException(error: unknown, contextTitle = 'Oups, réseau instable'): SentryEventReport {
    const errMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Une anomalie temporaire est survenue sur le noeud blockchain.';

    const report: SentryEventReport = {
      id: `sentry-${Date.now()}`,
      title: contextTitle,
      message: errMessage,
      timestamp: new Date().toISOString(),
      canRetry: true,
    };

    this.logs.unshift(report);
    return report;
  }

  public captureBreadcrumb(message: string): void {
    this.logs.unshift({
      id: `crumb-${Date.now()}`,
      title: 'Breadcrumb',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  public getRecentReports(): SentryEventReport[] {
    return this.logs.slice(0, 20);
  }
}

export const sentryClient = new SentryClient();
export default sentryClient;
