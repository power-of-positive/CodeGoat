# Vibe Kanban: Rust to TypeScript Migration Plan

## Executive Summary

This document outlines a comprehensive migration strategy to transition the Vibe Kanban backend from Rust to TypeScript while maintaining production-grade reliability, security, and observability. The migration emphasizes free, open-source tools and battle-tested solutions.

## 📋 Migration Overview

### Current State

- **Backend**: Rust with Axum, SQLX, SQLite
- **Database**: SQLite with raw SQL migrations
- **Features**: Git worktree management, AI agent orchestration, WebSocket streaming

### Target State

- **Backend**: Node.js with TypeScript, Express/Fastify
- **Database**: SQLite/PostgreSQL with Kysely (type-safe queries)
- **Infrastructure**: Containerized with Docker, monitored with Prometheus/Grafana

---

## 🗄️ Database Migration Strategy

### Phase 1: Schema Migration

#### Tool Selection

```json
{
  "primary": "kysely",
  "driver": "better-sqlite3",
  "alternatives": {
    "production": "pg (PostgreSQL)",
    "orm_alternative": "drizzle-orm"
  }
}
```

#### Migration Implementation

```typescript
// migrations/001_init.ts
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA foreign_keys = ON`.execute(db);

  // Projects table
  await db.schema
    .createTable("projects")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("git_repo_path", "text", (col) => col.notNull().unique())
    .addColumn("setup_script", "text")
    .addColumn("dev_script", "text")
    .addColumn("cleanup_script", "text")
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`datetime('now', 'subsec')`),
    )
    .addColumn("updated_at", "text", (col) =>
      col.notNull().defaultTo(sql`datetime('now', 'subsec')`),
    )
    .execute();

  // Tasks table with enum constraint
  await db.schema
    .createTable("tasks")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("project_id", "text", (col) =>
      col.notNull().references("projects.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("status", "text", (col) =>
      col
        .notNull()
        .defaultTo("todo")
        .check(
          sql`status IN ('todo','inprogress','done','cancelled','inreview')`,
        ),
    )
    .addColumn("parent_task_attempt", "text", (col) =>
      col.references("task_attempts.id"),
    )
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`datetime('now', 'subsec')`),
    )
    .addColumn("updated_at", "text", (col) =>
      col.notNull().defaultTo(sql`datetime('now', 'subsec')`),
    )
    .execute();

  // Continue with other tables...
}
```

#### Data Migration Script

```typescript
// scripts/migrate-data.ts
import { Kysely, SqliteDialect } from "kysely";
import SQLite from "better-sqlite3";
import { Database } from "../src/types/database";

export async function migrateFromRust() {
  const rustDb = new SQLite("./backend/database.db", { readonly: true });
  const tsDb = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new SQLite("./backend-ts/app.db"),
    }),
  });

  console.log("🔄 Starting data migration...");

  // Migrate projects
  const projects = rustDb.prepare("SELECT * FROM projects").all();
  await tsDb.transaction().execute(async (trx) => {
    for (const project of projects) {
      await trx.insertInto("projects").values(project).execute();
    }
  });

  // Migrate tasks with batch processing
  const tasks = rustDb.prepare("SELECT * FROM tasks").all();
  const batchSize = 1000;

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await tsDb.transaction().execute(async (trx) => {
      for (const task of batch) {
        await trx.insertInto("tasks").values(task).execute();
      }
    });
    console.log(
      `✅ Migrated ${Math.min(i + batchSize, tasks.length)}/${tasks.length} tasks`,
    );
  }

  console.log("✅ Data migration completed");
}
```

### Phase 2: Type-Safe Repository Pattern

```typescript
// src/repositories/BaseRepository.ts
import { Kysely, Insertable, Updateable, Selectable } from "kysely";
import { Database } from "../types/database";

export abstract class BaseRepository<T extends keyof Database> {
  constructor(
    protected db: Kysely<Database>,
    protected table: T,
  ) {}

  async findById(id: string): Promise<Selectable<Database[T]> | undefined> {
    return this.db
      .selectFrom(this.table)
      .selectAll()
      .where("id" as any, "=", id)
      .executeTakeFirst();
  }

  async create(
    data: Insertable<Database[T]>,
  ): Promise<Selectable<Database[T]>> {
    return this.db
      .insertInto(this.table)
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    id: string,
    data: Updateable<Database[T]>,
  ): Promise<Selectable<Database[T]>> {
    return this.db
      .updateTable(this.table)
      .set(data)
      .where("id" as any, "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
```

---

## 🔐 Security Implementation

### Authentication & Authorization

```typescript
// src/middleware/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

// JWT Authentication
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// Rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});
```

### Input Validation & Sanitization

```typescript
// src/middleware/validation.ts
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// Schema definitions
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  git_repo_path: z.string().min(1).max(500),
  setup_script: z.string().optional(),
  dev_script: z.string().optional(),
  cleanup_script: z.string().optional(),
});

export const createTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  parent_task_attempt: z.string().uuid().optional(),
});

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
```

### Security Headers & CORS

```typescript
// src/middleware/security.ts
import helmet from "helmet";
import cors from "cors";

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
];
```

---

## 🛡️ Reliability Framework

### Error Handling

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new AppError(message, 404);
  }

  // Duplicate key error
  if (
    err.name === "SqliteError" &&
    (err as any).code === "SQLITE_CONSTRAINT_UNIQUE"
  ) {
    const message = "Duplicate field value entered";
    error = new AppError(message, 400);
  }

  // Validation error
  if (err.name === "ValidationError") {
    const message = "Invalid input data";
    error = new AppError(message, 400);
  }

  res.status((error as AppError).statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
```

### Health Checks & Graceful Shutdown

```typescript
// src/middleware/health.ts
import { Request, Response } from "express";
import { Kysely } from "kysely";
import { Database } from "../types/database";

export class HealthChecker {
  constructor(private db: Kysely<Database>) {}

  async checkDatabase(): Promise<boolean> {
    try {
      await this.db.selectFrom("projects").select("id").limit(1).execute();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getHealthStatus(): Promise<{
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime: number;
    checks: Record<string, boolean>;
  }> {
    const checks = {
      database: await this.checkDatabase(),
      memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // 500MB
    };

    const allHealthy = Object.values(checks).every(Boolean);

    return {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}

// Graceful shutdown
export function setupGracefulShutdown(server: any, db: Kysely<Database>) {
  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      console.log("HTTP server closed.");

      try {
        await db.destroy();
        console.log("Database connections closed.");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error(
        "Could not close connections in time, forcefully shutting down",
      );
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
```

### Circuit Breaker Pattern

```typescript
// src/utils/circuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000,
    private monitoringPeriod = 10000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }
}
```

---

## 📊 Monitoring & Observability

### Logging with Structured Data

```typescript
// src/utils/logger.ts
import winston from "winston";
import "winston-daily-rotate-file";

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "vibe-kanban-backend" },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),

    // File transports
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "14d",
    }),

    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

// Create request logger middleware
export const requestLogger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "logs/access-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});
```

### Metrics with Prometheus

```typescript
// src/utils/metrics.ts
import promClient from "prom-client";

// Create a Registry
export const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "vibe-kanban-backend",
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const activeConnections = new promClient.Gauge({
  name: "websocket_connections_active",
  help: "Number of active WebSocket connections",
});

export const databaseQueryDuration = new promClient.Histogram({
  name: "database_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const taskExecutionDuration = new promClient.Histogram({
  name: "task_execution_duration_seconds",
  help: "Duration of task executions in seconds",
  labelNames: ["executor_type", "status"],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(taskExecutionDuration);

// Metrics middleware
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
};
```

### OpenTelemetry Tracing

```typescript
// src/utils/tracing.ts
import { NodeSDK } from "@opentelemetry/auto-instrumentations-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "vibe-kanban-backend",
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version || "1.0.0",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

export default sdk;
```

### Grafana Dashboard Configuration

```yaml
# docker-compose.monitoring.yml
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"
      - "--storage.tsdb.retention.time=200h"
      - "--web.enable-lifecycle"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3333:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

volumes:
  prometheus_data:
  grafana_data:
```

---

## 📅 Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)

- [ ] Setup TypeScript project structure
- [ ] Configure build pipeline with Docker
- [ ] Implement database migration system
- [ ] Setup basic logging and error handling
- [ ] Create CI/CD pipeline

### Phase 2: Core Migration (Weeks 3-4)

- [ ] Migrate database models and repositories
- [ ] Implement authentication and authorization
- [ ] Port API endpoints from Rust
- [ ] Setup comprehensive testing suite
- [ ] Implement data migration scripts

### Phase 3: Reliability & Security (Weeks 5-6)

- [ ] Implement circuit breakers and retry logic
- [ ] Setup comprehensive input validation
- [ ] Configure security headers and CORS
- [ ] Implement rate limiting
- [ ] Setup health checks and graceful shutdown

### Phase 4: Monitoring & Production (Weeks 7-8)

- [ ] Setup Prometheus metrics collection
- [ ] Configure Grafana dashboards
- [ ] Implement OpenTelemetry tracing
- [ ] Setup log aggregation and alerting
- [ ] Performance testing and optimization

### Phase 5: Deployment & Validation (Week 9)

- [ ] Production deployment with zero downtime
- [ ] Data validation and integrity checks
- [ ] Performance benchmarking
- [ ] Documentation and team training
- [ ] Go-live and monitoring

---

## 🚨 Risk Mitigation

### Data Migration Risks

- **Risk**: Data loss during migration
- **Mitigation**: Multiple backups, dry-run testing, rollback scripts

### Performance Risks

- **Risk**: TypeScript slower than Rust
- **Mitigation**: Comprehensive benchmarking, caching strategies, database optimization

### Security Risks

- **Risk**: New vulnerabilities in JavaScript ecosystem
- **Mitigation**: Regular security audits, dependency scanning, strict CSP policies

### Reliability Risks

- **Risk**: Reduced stability compared to Rust
- **Mitigation**: Comprehensive error handling, circuit breakers, monitoring

---

## 📈 Success Metrics

- **Performance**: Response times < 200ms (95th percentile)
- **Reliability**: 99.9% uptime
- **Security**: Zero security incidents
- **Developer Experience**: 50% faster feature development
- **Monitoring**: 100% observability coverage

---

## 🛠️ Development Tools & Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "kysely": "^0.27.2",
    "better-sqlite3": "^9.1.1",
    "zod": "^3.22.4",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0",
    "prom-client": "^15.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.2",
    "tsx": "^4.6.0",
    "vitest": "^1.0.4",
    "supertest": "^6.3.3",
    "docker": "latest"
  }
}
```

This comprehensive plan ensures a smooth, secure, and reliable migration from Rust to TypeScript while maintaining production-grade quality and observability.
