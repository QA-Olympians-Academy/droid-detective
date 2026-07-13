/* eslint-disable */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(...args: unknown[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log('🔍 [DEBUG]', ...args);
    }
  }

  public info(...args: unknown[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log('ℹ️  [INFO]', ...args);
    }
  }

  public warn(...args: unknown[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn('⚠️  [WARN]', ...args);
    }
  }

  public error(...args: unknown[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error('❌ [ERROR]', ...args);
    }
  }

  public log(...args: unknown[]): void {
    console.log(...args);
  }
}

export const logger = Logger.getInstance();

export function parseLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    case 'silent':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}
