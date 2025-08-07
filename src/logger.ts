import { Request, Response, NextFunction } from 'express';

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  routeName?: string;
  targetUrl?: string;
}

export class Logger {
  private level: string;
  private format: string;

  constructor(level: string = 'info', format: string = 'json') {
    this.level = level;
    this.format = format;
  }

  log(entry: LogEntry): void {
    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const message = `[${entry.timestamp}] ${entry.method} ${entry.path} ${entry.statusCode || '-'} ${entry.duration || '-'}ms ${entry.error || ''}`;
      console.log(message);
    }
  }

  error(message: string, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: 'ERROR',
      path: '',
      error: error ? `${message}: ${error.message}` : message
    };
    this.log(entry);
  }

  info(message: string): void {
    if (this.level === 'debug' || this.level === 'info') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method: 'INFO',
        path: '',
        error: message
      };
      this.log(entry);
    }
  }

  middleware() {
    const logger = this;
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalEnd = res.end;
      
      res.end = function(this: Response, ...args: any[]) {
        res.end = originalEnd;
        const result = originalEnd.apply(this, args as any);
        
        const duration = Date.now() - startTime;
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          routeName: (req as any).routeName,
          targetUrl: (req as any).targetUrl
        };
        
        logger.log(entry);
        return result;
      } as any;
      
      next();
    };
  }
}