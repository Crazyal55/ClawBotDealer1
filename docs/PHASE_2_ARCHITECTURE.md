# Phase 2 Production Architecture

**Version:** 2.0  
**Author:** Senior Backend Architect Review  
**Last Updated:** February 13, 2026  
**Status:** Design Phase - Pending Approval

---

## 🎯 Executive Summary

This document outlines the **production-grade architecture** for Phase 2 of the AI Dealership Platform. The design prioritizes:

1. **Clean layer separation** - No tight coupling
2. **Vendor lock-in prevention** - Abstract vector DB and LLM layers
3. **Asynchronous processing** - Scraping runs in background
4. **Multi-tenancy** - Support 10→200 dealerships
5. **Observability** - Comprehensive logging and monitoring
6. **Scalability** - Clear path from MVP to enterprise

**Critical Principle:** **Tight boundaries, loose coupling.** Each layer should be replaceable without affecting others.

---

## 📊 System Architecture (Phase 2)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
│                    (Dealership UI / Admin)                   │
└────────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Express)                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  • Rate limiting per dealership                          │  │
│  │  • Authentication (JWT)                                 │  │
│  │  • Request validation                                     │  │
│  │  • API versioning                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  InventoryService - CRUD, search, filters              │  │
│  │  ScrapingService - Schedule, manage, status               │  │
│  │  QualityService - Scoring, flags, recalculations           │  │
│  │  VectorService - Embeddings, similarity search               │  │
│  │  AIService - Chat, RAG, analysis                        │  │
│  │  DealershipService - Multi-tenant management              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌─────────────┐ ┌──────────────┐
│   REPOSITORY    │ │    QUEUE    │ │   VECTOR     │
│     LAYER      │ │   LAYER     │ │    DB        │
│                │ │             │ │   (Abstract) │
│ PostgreSQLRepo │ │   BullMQ    │ │              │
│               │ │   Redis     │ │ Pinecone     │
│ ScrapingRepo  │ │   (Jobs)   │ │ Qdrant       │
│ QualityRepo   │ │             │ │              │
│ DealershipRepo│ │             │ └──────────────┘
└──────────────────┘ └─────────────┘
       ▼                      ▼
┌──────────────────┐ ┌─────────────┐
│   PostgreSQL   │ │    REDIS    │
│   (Primary)    │ │   (Cache/   │
│                │ │   Queue)    │
│ • vehicles     │ │             │
│ • dealerships │ │             │
│ • quality     │ │             │
│ • embeddings  │ │             │
└──────────────────┘ └─────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  • OpenAI API (GPT-4, embeddings)                    │  │
│  │  • Pinecone API (Vector search)                        │  │
│  │  • Qdrant API (Alternative vector DB)                    │  │
│  │  • Anthropic/Claude (Alternative LLM)                    │  │
│  │  • Dealership websites (Scraping targets)                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   MONITORING & LOGGING                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  • Structured logging (Winston)                         │  │
│  │  • Metrics collection (Prometheus)                      │  │
│  │  • Distributed tracing (OpenTelemetry)                    │  │
│  │  • Alerting (PagerDuty/Slack)                          │  │
│  │  • Log aggregation (Grafana/Loki)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    JOB PROCESSING                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  • Scraping Worker (Background jobs)                     │  │
│  │  • Quality Recalculation Worker                           │  │
│  │  • Embedding Generation Worker                            │  │
│  │  • Vector Sync Worker                                     │  │
│  │  • Scheduled Maintenance Jobs                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Layer Separation

### 1. API Gateway Layer (`src/api/`)
**Responsibilities:**
- HTTP request handling
- Authentication & authorization
- Rate limiting (per dealership)
- Request validation
- Response formatting
- API versioning

**Critical Rule:** **NO business logic in API layer.** Only orchestration.

```javascript
// ❌ WRONG: Business logic in API
app.post('/api/scrape', async (req, res) => {
  const url = req.body.url;
  // Don't do this!
  const scraped = await fetch(url);
  const quality = calculateQuality(scraped);
  await saveToDB(scraped, quality);
  res.json({ success: true });
});

// ✅ RIGHT: Delegate to services
app.post('/api/scrape', async (req, res) => {
  const { dealershipId, url } = req.body;
  // Delegate to service layer
  const result = await scrapingService.scheduleScrape(dealershipId, url);
  res.json(result);
});
```

---

### 2. Service Layer (`src/services/`)
**Responsibilities:**
- Business logic
- Service orchestration
- Complex operations
- Transaction management
- Caching strategy

**Critical Rule:** **NO direct DB access in services.** Use repositories.

```javascript
class InventoryService {
  constructor(
    private inventoryRepo: InventoryRepository,
    private vectorService: VectorService,
    private logger: Logger
  ) {}

  async addVehicle(data: VehicleData): Promise<Vehicle> {
    // Validate
    this.validateVehicle(data);

    // Check for duplicates (VIN)
    const existing = await this.inventoryRepo.findByVIN(data.vin);
    if (existing) {
      throw new DuplicateVehicleError(data.vin);
    }

    // Calculate quality
    const quality = await this.qualityService.calculate(data);

    // Save
    const vehicle = await this.inventoryRepo.create({ ...data, quality });

    // Generate embedding (async, non-blocking)
    this.vectorService.embedVehicle(vehicle.id, data.description);

    // Log
    this.logger.info({ vehicleId: vehicle.id, dealershipId: data.dealershipId }, 'Vehicle added');

    return vehicle;
  }
}
```

---

### 3. Repository Layer (`src/repositories/`)
**Responsibilities:**
- Database operations
- Query construction
- Data mapping
- Transaction boundaries

**Critical Rule:** **No business logic.** Only data access.

```javascript
class InventoryRepository {
  constructor(private db: Database) {}

  async create(data: VehicleInput): Promise<Vehicle> {
    const query = `
      INSERT INTO vehicles (vin, make, model, year, price, dealership_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await this.db.query(query, [
      data.vin, data.make, data.model, data.year, data.price, data.dealershipId
    ]);
    return this.mapToEntity(result[0]);
  }

  async findByVIN(vin: string): Promise<Vehicle | null> {
    const query = `SELECT * FROM vehicles WHERE vin = $1 AND dealership_id = $2`;
    const result = await this.db.query(query, [vin, this.dealershipId]);
    return result.length > 0 ? this.mapToEntity(result[0]) : null;
  }
}
```

---

### 4. Queue Layer (`src/queue/`)
**Responsibilities:**
- Job scheduling
- Worker management
- Job retries
- Priority queuing
- Dead letter queue

**Critical Rule:** **All long-running operations go through queue.**

```javascript
class ScrapingJobQueue {
  constructor(private queue: BullQueue, private scrapers: Map<string, Scraper>) {}

  async scheduleScrape(dealershipId: string, url: string, priority: number = 5) {
    const job = await this.queue.add('scrape', {
      dealershipId,
      url,
      scheduledAt: Date.now(),
      attempt: 0
    }, {
      priority,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 10,
      removeOnFail: 100
    });

    return { jobId: job.id, status: 'scheduled' };
  }
}
```

---

### 5. Vector DB Layer (`src/vector/`)
**Responsibilities:**
- Vector embeddings generation
- Vector search operations
- Vector DB abstraction
- Index management

**Critical Rule:** **Abstract vector DB interface to avoid vendor lock-in.**

```javascript
// Interface (vendor-agnostic)
interface IVectorDatabase {
  upsert(id: string, vector: number[], metadata: any): Promise<void>;
  search(query: number[], topK: number, filters: any): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
}

// Pinecone implementation
class PineconeVectorDB implements IVectorDatabase {
  async upsert(id: string, vector: number[], metadata: any): Promise<void> {
    await this.pinecone.index('vehicles').upsert([{
      id,
      values: vector,
      metadata
    }]);
  }
}

// Qdrant implementation
class QdrantVectorDB implements IVectorDatabase {
  async upsert(id: string, vector: number[], metadata: any): Promise<void> {
    await this.qdrant.upsert('vehicles', {
      points: [{ id, vector, payload: metadata }]
    });
  }
}
```

---

### 6. AI/LLM Layer (`src/ai/`)
**Responsibilities:**
- LLM API integration
- Prompt engineering
- Response parsing
- Model selection
- Fallback strategies

**Critical Rule:** **Abstract LLM provider to switch models easily.**

```javascript
// Interface (provider-agnostic)
interface ILLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  generateEmbedding(text: string): Promise<number[]>;
  estimateCost(messages: Message[]): number;
}

// OpenAI implementation
class OpenAIProvider implements ILLMProvider {
  constructor(private apiKey: string, private model: string = 'gpt-4') {}

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const completion = await openai.chat.completions.create({
      model: this.model,
      messages,
      ...options
    });
    return this.parseResponse(completion);
  }
}

// Anthropic/Claude implementation
class AnthropicProvider implements ILLMProvider {
  constructor(private apiKey: string, private model: string = 'claude-3-opus') {}

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const completion = await anthropic.messages.create({
      model: this.model,
      messages,
      ...options
    });
    return this.parseResponse(completion);
  }
}

// Service with provider abstraction
class AIService {
  private provider: ILLMProvider;

  constructor(config: AIConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: AIConfig): ILLMProvider {
    switch (config.provider) {
      case 'openai': return new OpenAIProvider(config.apiKey, config.model);
      case 'anthropic': return new AnthropicProvider(config.apiKey, config.model);
      default: throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  async analyzeVehicle(vehicle: Vehicle, query: string): Promise<string> {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: this.formatVehicleContext(vehicle, query) }
    ];

    return await this.provider.chat(messages);
  }
}
```

---

## 🔄 Asynchronous Scraping Design

### Scraping Flow (Async)

```
┌────────────┐
│  UI:       │ User clicks "Scrape Dealership"
│  POST      │ ───────────────────────────┐
│  /scrape   │                          │
└────────────┘                          │
                                        ▼
                              ┌──────────────────┐
                              │  ScrapingService│
                              └──────────────────┘
                                        │
                  ┌───────────────────────┼───────────────────────┐
                  │                       │                       │
                  ▼                       ▼                       ▼
        ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
        │  Validate URL   │    │  Check Queue     │    │  Get Dealer ID │
        └──────────────────┘    └──────────────────┘    └──────────────────┘
                  │                       │                       │
                  └───────────────────────┴───────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  JobQueue       │
                              │  (BullMQ/Redis) │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  Return Job ID  │
                              └──────────────────┘

┌────────────┐
│  Response:  │ Job ID: scrape_abc123
│  {         │ Status: scheduled
│  jobId     │ ETA: ~5min
│  status     │
│  }         │
└────────────┘

                    (Background Processing)
                              ┌──────────────────┐
                              │  Scraper Worker  │
                              │  (BullMQ Worker) │
                              └──────────────────┘
                                        │
                  ┌───────────────┴───────────────┐
                  │                           │
                  ▼                           ▼
        ┌──────────────────┐    ┌──────────────────┐
        │  Fetch HTML     │    │  Parse Data     │
        └──────────────────┘    └──────────────────┘
                  │                           │
                  └───────────────┴───────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  QualityService  │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  InventoryRepo   │
                              └──────────────────┘
                                        │
                  ┌───────────────┴───────────────┐
                  │                           │
                  ▼                           ▼
        ┌──────────────────┐    ┌──────────────────┐
        │  Update Job     │    │  Trigger Embedding│
        │  Status: Done   │    │  Job            │
        └──────────────────┘    └──────────────────┘
```

### Key Principles

1. **Immediate Response:** UI gets job ID immediately (no waiting)
2. **Queue-Based Processing:** BullMQ + Redis for reliability
3. **Job Progress Updates:** WebSocket or polling for status
4. **Retry Logic:** Exponential backoff for failures
5. **Dead Letter Queue:** Failed jobs for manual review
6. **Worker Isolation:** Scraper crashes don't affect API

---

## 🔒 Vector DB Abstraction (Vendor Lock-in Prevention)

### Interface-Based Design

```typescript
// src/vector/interfaces.ts
export interface IVectorDatabase {
  // Operations
  upsert(id: string, vector: number[], metadata: VectorMetadata): Promise<void>;
  search(query: number[], topK: number, filters?: VectorFilter): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  deleteByFilter(filters: VectorFilter): Promise<number>;
  batchUpsert(items: VectorItem[]): Promise<UpsertResult>;

  // Metadata
  createCollection(name: string, dimension: number): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  getCollectionStats(name: string): Promise<CollectionStats>;
}

// src/vector/pinecone.ts
export class PineconeVectorDB implements IVectorDatabase {
  constructor(private client: Pinecone) {}

  async upsert(id: string, vector: number[], metadata: VectorMetadata): Promise<void> {
    await this.client.index('vehicles').upsert([{
      id,
      values: vector,
      metadata: {
        ...metadata,
        provider: 'pinecone',
        upsertedAt: new Date().toISOString()
      }
    }]);
  }

  async search(query: number[], topK: number, filters?: VectorFilter): Promise<SearchResult[]> {
    const results = await this.client.index('vehicles').query({
      vector: query,
      topK,
      filter: filters ? this.buildPineconeFilter(filters) : undefined,
      includeMetadata: true
    });
    return this.mapSearchResults(results);
  }
}

// src/vector/qdrant.ts
export class QdrantVectorDB implements IVectorDatabase {
  constructor(private client: QdrantClient) {}

  async upsert(id: string, vector: number[], metadata: VectorMetadata): Promise<void> {
    await this.client.upsert('vehicles', {
      points: [{
        id,
        vector,
        payload: {
          ...metadata,
          provider: 'qdrant',
          upsertedAt: new Date().toISOString()
        }
      }]
    });
  }

  async search(query: number[], topK: number, filters?: VectorFilter): Promise<SearchResult[]> {
    const results = await this.client.search('vehicles', {
      vector: query,
      limit: topK,
      filter: filters ? this.buildQdrantFilter(filters) : undefined,
      with_payload: true
    });
    return this.mapSearchResults(results);
  }
}
```

### Provider Selection

```typescript
// src/vector/factory.ts
export class VectorDBFactory {
  static create(config: VectorDBConfig): IVectorDatabase {
    switch (config.provider) {
      case 'pinecone':
        return new PineconeVectorDB(new Pinecone({ apiKey: config.apiKey }));
      case 'qdrant':
        return new QdrantVectorDB(new QdrantClient({ url: config.url }));
      default:
        throw new Error(`Unknown vector DB provider: ${config.provider}`);
    }
  }
}

// Usage (config-driven)
const vectorDB = VectorDBFactory.create({
  provider: process.env.VECTOR_DB_PROVIDER, // 'pinecone' | 'qdrant'
  apiKey: process.env.PINECONE_API_KEY,
  url: process.env.QDRANT_URL
});

// Can switch without changing code!
```

### Migration Path

```typescript
// src/vector/migration.ts
export class VectorDBMigration {
  async migrate(from: IVectorDatabase, to: IVectorDatabase): Promise<void> {
    const batchSize = 100;
    let offset = 0;
    
    while (true) {
      // Read from old provider
      const items = await from.getAll({ limit: batchSize, offset });
      
      if (items.length === 0) break;
      
      // Write to new provider
      await to.batchUpsert(items);
      
      offset += batchSize;
      console.log(`Migrated ${offset} items...`);
    }
    
    console.log('Migration complete!');
  }
}
```

---

## 🤖 LLM Abstraction Layer (Multi-Provider Support)

### Unified Interface

```typescript
// src/ai/interfaces.ts
export interface ILLMProvider {
  // Chat
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatChunk>;
  
  // Embeddings
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingBatch(texts: string[]): Promise<number[][]>;
  
  // Metadata
  getModel(): string;
  estimateCost(messages: Message[]): number;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  cost: number;
}
```

### Provider Implementations

```typescript
// src/ai/providers/openai.ts
export class OpenAIProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private model: string = 'gpt-4'
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 4096
    });

    return {
      content: completion.choices[0].message.content,
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      },
      model: this.model,
      cost: this.estimateCostFromUsage(completion.usage)
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    return response.data[0].embedding;
  }
}

// src/ai/providers/anthropic.ts
export class AnthropicProvider implements ILLMProvider {
  constructor(
    private apiKey: string,
    private model: string = 'claude-3-opus-20240229'
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      messages: this.convertToAnthropicFormat(messages),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7
    });

    return {
      content: response.content[0].text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      },
      model: this.model,
      cost: this.estimateCostFromUsage(response.usage)
    };
  }
}
```

### Service Layer with Provider Abstraction

```typescript
// src/ai/ai.service.ts
export class AIService {
  private chatProvider: ILLMProvider;
  private embeddingProvider: ILLMProvider;

  constructor(config: AIConfig) {
    // Chat can use different provider than embeddings
    this.chatProvider = this.createProvider(config.chat);
    this.embeddingProvider = this.createProvider(config.embeddings);
  }

  async chatWithVehicleContext(
    vehicle: Vehicle,
    query: string,
    conversationHistory: Message[] = []
  ): Promise<ChatResponse> {
    const messages = [
      { role: 'system', content: this.getVehicleSystemPrompt(vehicle) },
      ...conversationHistory,
      { role: 'user', content: query }
    ];

    return await this.chatProvider.chat(messages);
  }

  async searchVehicles(
    query: string,
    dealershipId: string
  ): Promise<ChatResponse> {
    // 1. Generate embedding for query
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

    // 2. Search vector DB
    const similarVehicles = await this.vectorService.search(
      queryEmbedding,
      topK: 5,
      filters: { dealershipId }
    );

    // 3. Generate response with context
    const context = this.formatVehiclesContext(similarVehicles);
    const messages = [
      { role: 'system', content: 'You are a dealership AI assistant.' },
      { role: 'user', content: `User query: "${query}"\n\nSimilar vehicles:\n${context}` }
    ];

    return await this.chatProvider.chat(messages);
  }
}
```

---

## 📊 Monitoring & Logging Design

### Structured Logging

```typescript
// src/logging/logger.ts
export class StructuredLogger {
  constructor(private winston: Logger) {}

  info(data: LogData, message: string): void {
    this.winston.info({
      timestamp: new Date().toISOString(),
      level: 'info',
      ...data,
      message
    });
  }

  error(error: Error, data: LogData, message: string): void {
    this.winston.error({
      timestamp: new Date().toISOString(),
      level: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...data,
      message
    });
  }

  // Contextual logging
  logApiRequest(req: Request, res: Response, duration: number): void {
    this.info({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      dealershipId: req.user?.dealershipId
    }, 'API Request');
  }

  logScrapingJob(job: ScrapingJob): void {
    this.info({
      jobId: job.id,
      dealershipId: job.dealershipId,
      url: job.url,
      status: job.status,
      vehiclesFound: job.vehiclesFound,
      duration: job.completedAt - job.startedAt
    }, 'Scraping Job');
  }
}
```

### Metrics Collection

```typescript
// src/metrics/prometheus.ts
export class MetricsCollector {
  private register: Registry;
  
  constructor() {
    this.register = new Registry();
    this.defineMetrics();
  }

  private defineMetrics() {
    new Counter({
      name: 'api_requests_total',
      help: 'Total API requests',
      labelNames: ['endpoint', 'method', 'status']
    });

    new Histogram({
      name: 'scraping_duration_seconds',
      help: 'Scraping job duration',
      labelNames: ['dealership_id', 'success'],
      buckets: [10, 30, 60, 120, 300, 600]
    });

    new Gauge({
      name: 'active_scraping_jobs',
      help: 'Currently active scraping jobs'
    });

    new Counter({
      name: 'vector_db_operations_total',
      help: 'Vector DB operations',
      labelNames: ['operation', 'provider']
    });
  }

  recordApiRequest(endpoint: string, method: string, status: number): void {
    this.register.getCounter('api_requests_total')
      .inc({ endpoint, method, status: status.toString() });
  }

  recordScrapingDuration(dealershipId: string, success: boolean, duration: number): void {
    this.register.getHistogram('scraping_duration_seconds')
      .observe({ dealership_id: dealershipId, success: success.toString() }, duration);
  }
}
```

### Alerting Strategy

```typescript
// src/alerting/alerting.service.ts
export class AlertingService {
  async checkAndAlert(type: AlertType, data: any): Promise<void> {
    const severity = this.calculateSeverity(type, data);
    
    if (severity < this.thresholds[type]) {
      return; // Below alert threshold
    }

    const alert = this.createAlert(type, severity, data);
    
    // Send to multiple channels
    await Promise.all([
      this.sendToSlack(alert),
      this.sendToPagerDuty(alert),
      this.sendToEmail(alert)
    ]);
  }

  private createAlert(type: AlertType, severity: string, data: any): Alert {
    return {
      type,
      severity,
      message: this.formatMessage(type, data),
      data,
      timestamp: new Date(),
      correlationId: this.generateCorrelationId()
    };
  }
}
```

---

## 📈 Scaling Analysis

### Scale Tiers

| Metric | 10 Dealerships | 50 Dealerships | 200 Dealerships |
|--------|----------------|----------------|-----------------|
| **Vehicles** | ~5,000 | ~25,000 | ~100,000 |
| **Scrapes/Day** | ~100 | ~500 | ~2,000 |
| **API Requests/Day** | ~1,000 | ~5,000 | ~20,000 |
| **Concurrent Scrapes** | 1-2 | 5-10 | 20-50 |
| **Vector Size** | ~5M | ~25M | ~100M |
| **LLM Tokens/Day** | ~100K | ~500K | ~2M |
| **Database Size** | ~50MB | ~250MB | ~1GB |
| **Estimated Monthly Cost** | $100-200 | $400-800 | $1,500-3,000 |

### Bottleneks & Solutions

#### 10 Dealerships (Current)
**Status:** ✅ No issues

**Architecture:**
- Single PostgreSQL instance (small tier)
- Single Redis instance (cache tier)
- Single worker (scraping queue)
- Pinecone Starter tier

---

#### 50 Dealerships (Scale Point)
**Status:** ⚠️ Optimization needed

**Bottleneks:**
1. **Scraping Queue** - Single worker insufficient
2. **Database** - May hit connection limits
3. **Vector DB** - Pinecone Starter tier limits

**Solutions:**
1. **Add 3-5 scraping workers** (horizontal scaling)
2. **Upgrade PostgreSQL** to Standard tier
3. **Add connection pool** (pg-bouncer)
4. **Upgrade Pinecone** to Standard tier
5. **Add Redis cluster** for queue

---

#### 200 Dealerships (Enterprise)
**Status:** ❌ Major architecture changes needed

**Bottleneks:**
1. **API Gateway** - Single instance will choke
2. **Database** - Write bottleneck, need sharding
3. **Vector DB** - Pinecone expensive, need self-hosted
4. **LLM API** - Rate limits, need caching
5. **Monitoring** - Need distributed tracing

**Solutions:**
1. **API Gateway** - Load balancer + 3+ instances
2. **Database** - Read replicas + write primary + connection pool
3. **Vector DB** - Migrate to self-hosted Qdrant
4. **LLM Caching** - Redis cache for common queries
5. **Job Queue** - Redis Cluster + 10+ workers
6. **Monitoring** - Full observability stack
7. **Multi-region** - Deploy to multiple Azure regions

---

## 📁 File/Folder Structure

```
dealership-platform/
├── src/
│   ├── api/                    # API Gateway Layer
│   │   ├── routes/            # API route definitions
│   │   ├── middleware/         # Auth, rate limiting, validation
│   │   ├── validators/         # Request validation schemas
│   │   └── index.ts           # API entry point
│   │
│   ├── services/               # Business Logic Layer
│   │   ├── inventory.service.ts
│   │   ├── scraping.service.ts
│   │   ├── quality.service.ts
│   │   ├── vector.service.ts
│   │   ├── ai.service.ts
│   │   └── dealership.service.ts
│   │
│   ├── repositories/           # Data Access Layer
│   │   ├── inventory.repository.ts
│   │   ├── scraping.repository.ts
│   │   ├── quality.repository.ts
│   │   ├── dealership.repository.ts
│   │   └── base.repository.ts
│   │
│   ├── models/                 # Domain Models
│   │   ├── vehicle.model.ts
│   │   ├── dealership.model.ts
│   │   ├── scraping-job.model.ts
│   │   └── quality.model.ts
│   │
│   ├── queue/                  # Job Queue Layer
│   │   ├── queue.ts           # BullMQ setup
│   │   ├── workers/           # Background workers
│   │   │   ├── scraper.worker.ts
│   │   │   ├── quality.worker.ts
│   │   │   ├── embedding.worker.ts
│   │   │   └── sync.worker.ts
│   │   └── jobs.ts           # Job definitions
│   │
│   ├── vector/                # Vector DB Layer (Abstract)
│   │   ├── interfaces.ts       # IVectorDatabase interface
│   │   ├── factory.ts         # Provider selection
│   │   ├── providers/
│   │   │   ├── pinecone.provider.ts
│   │   │   └── qdrant.provider.ts
│   │   └── migration.ts       # Migration tool
│   │
│   ├── ai/                    # AI/LLM Layer (Abstract)
│   │   ├── interfaces.ts       # ILLMProvider interface
│   │   ├── factory.ts         # Provider selection
│   │   ├── providers/
│   │   │   ├── openai.provider.ts
│   │   │   ├── anthropic.provider.ts
│   │   │   └── mock.provider.ts
│   │   └── prompts.ts         # Prompt templates
│   │
│   ├── logging/               # Logging Layer
│   │   ├── logger.ts
│   │   ├── formatters/       # Log formatters
│   │   └── transports/       # Log transports
│   │
│   ├── metrics/               # Metrics Layer
│   │   ├── prometheus.ts
│   │   ├── collectors/       # Custom collectors
│   │   └── registry.ts
│   │
│   ├── alerting/              # Alerting Layer
│   │   ├── service.ts
│   │   ├── channels/         # Slack, PagerDuty, Email
│   │   └── rules.ts          # Alert rules
│   │
│   ├── scrapers/              # Scraping Engine
│   │   ├── base.scraper.ts
│   │   ├── cars.scraper.ts
│   │   ├── autotrader.scraper.ts
│   │   └── factory.ts
│   │
│   ├── utils/                 # Shared Utilities
│   │   ├── cache.ts           # Cache utilities
│   │   ├── retry.ts          # Retry logic
│   │   ├── validation.ts     # Validation utilities
│   │   └── formatting.ts     # Formatting utilities
│   │
│   └── config/               # Configuration
│       ├── index.ts
│       ├── database.config.ts
│       ├── vector.config.ts
│       ├── ai.config.ts
│       └── env.ts             # Environment variables
│
├── public/                    # Static Assets
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
│
├── tests/                    # Test Suite
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   └── fixtures/               # Test data
│
├── migrations/                # Database Migrations
│   ├── 001_initial.up.sql
│   ├── 002_add_vectors.up.sql
│   └── ...
│
├── scripts/                   # Utility Scripts
│   ├── setup.sh
│   ├── migrate-to-postgres.sh
│   ├── sync-vectors.sh
│   └── backup.sh
│
├── docker/                   # Docker Configs
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
│
├── k8s/                      # Kubernetes Configs
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
│
├── monitoring/               # Monitoring Configs
│   ├── prometheus.yml
│   ├── grafana/
│   └── alerting/
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── .env.example              # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚠️ Critical Architectural Warnings

### ❌ Mistakes to Avoid

#### 1. **Business Logic in API Layer**
```javascript
// ❌ DON'T DO THIS
app.post('/api/vehicles', async (req, res) => {
  const { vin, make, model } = req.body;
  
  // Business logic in API - BAD!
  if (!isValidVIN(vin)) {
    return res.status(400).json({ error: 'Invalid VIN' });
  }
  
  const quality = calculateQuality(req.body); // BAD!
  const embedding = await generateEmbedding(req.body); // BAD!
  
  await db.insert({ vin, make, model, quality, embedding });
  res.json({ success: true });
});

// ✅ DO THIS INSTEAD
app.post('/api/vehicles', async (req, res) => {
  try {
    // Delegate to service layer
    const vehicle = await inventoryService.addVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

#### 2. **Tight Coupling to Vector DB**
```typescript
// ❌ DON'T DO THIS
class VectorService {
  async search(query: number[]) {
    // Direct Pinecone dependency - BAD!
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    return await pinecone.index('vehicles').query({ vector: query });
  }
}

// ✅ DO THIS INSTEAD
class VectorService {
  constructor(private vectorDB: IVectorDatabase) {} // Abstract interface
  
  async search(query: number[]) {
    // Can switch providers without changing code!
    return await this.vectorDB.search(query, { topK: 10 });
  }
}
```

#### 3. **Synchronous Scraping**
```javascript
// ❌ DON'T DO THIS
app.post('/api/scrape', async (req, res) => {
  // Blocking the API response - BAD!
  const result = await scrapeWebsite(req.body.url);
  await saveToDB(result);
  res.json(result);
});

// ✅ DO THIS INSTEAD
app.post('/api/scrape', async (req, res) => {
  // Queue job, return immediately
  const job = await scrapingQueue.add(req.body);
  res.json({ jobId: job.id, status: 'scheduled' });
});

// Process in background worker
scrapingWorker.process(async (job) => {
  const result = await scrapeWebsite(job.data.url);
  await saveToDB(result);
  await job.update({ status: 'completed' });
});
```

#### 4. **Direct LLM Provider Calls**
```typescript
// ❌ DON'T DO THIS
class AIService {
  async chat(messages: Message[]) {
    // Direct OpenAI call - BAD! Can't switch providers
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages
    });
    return completion.choices[0].message.content;
  }
}

// ✅ DO THIS INSTEAD
class AIService {
  constructor(private provider: ILLMProvider) {} // Abstract interface
  
  async chat(messages: Message[]) {
    // Provider-agnostic! Can switch anytime
    return await this.provider.chat(messages);
  }
}
```

#### 5. **No Error Boundaries**
```javascript
// ❌ DON'T DO THIS
async function scrapeAll() {
  const dealerships = await db.getDealerships();
  
  for (const dealership of dealerships) {
    // One failure crashes everything - BAD!
    await scrapeDealership(dealership.id);
  }
}

// ✅ DO THIS INSTEAD
async function scrapeAll() {
  const dealerships = await db.getDealerships();
  
  for (const dealership of dealerships) {
    try {
      await scrapingQueue.add({ dealershipId: dealership.id });
    } catch (error) {
      logger.error({ dealershipId: dealership.id, error }, 'Failed to schedule scrape');
      // Continue with next dealership
    }
  }
}
```

#### 6. **Hardcoded Configuration**
```typescript
// ❌ DON'T DO THIS
const config = {
  openaiApiKey: 'sk-abc123', // Hardcoded - BAD!
  pineconeApiKey: 'xyz789',
  embeddingModel: 'text-embedding-ada-002'
};

// ✅ DO THIS INSTEAD
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY, // Environment variables
  pineconeApiKey: process.env.PINECONE_API_KEY,
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  // Can override with config file
  ...loadConfigFile()
};
```

---

## ✅ Success Criteria

### Phase 2 MVP
- [ ] All layers properly separated
- [ ] Scraping is async with queue
- [ ] Vector DB interface abstracted
- [ ] LLM provider interface abstracted
- [ ] Multi-tenancy supported (10 dealerships)
- [ ] Structured logging implemented
- [ ] Metrics collected (Prometheus)
- [ ] Alerting configured (critical errors only)
- [ ] File structure follows conventions
- [ ] Environment-based configuration

### Phase 2 Production
- [ ] Load balancer + API cluster
- [ ] Database read replicas
- [ ] Redis cluster for queue
- [ ] Vector DB migration path tested
- [ ] LLM fallback strategies implemented
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Full observability stack
- [ ] Auto-scaling configured
- [ ] Multi-region deployment tested

---

## 📋 Implementation Priority

### Week 1-2: Foundation
1. **Set up folder structure**
2. **Implement repository layer** (PostgreSQL)
3. **Implement service layer** (no DB access)
4. **Add BullMQ + Redis** (job queue)
5. **Implement structured logging**

### Week 3-4: Vector & AI
6. **Implement vector DB abstraction** (Pinecone)
7. **Implement LLM abstraction** (OpenAI)
8. **Add embedding generation worker**
9. **Add vector search service**
10. **RAG pipeline implementation**

### Week 5-6: Scraping & Jobs
11. **Implement scraping workers**
12. **Add scraping job scheduling**
13. **Add quality scoring worker**
14. **Add error handling & retries**
15. **Add job progress tracking**

### Week 7-8: Monitoring
16. **Add Prometheus metrics**
17. **Add Grafana dashboards**
18. **Add alerting rules**
19. **Add distributed tracing**
20. **Load testing & optimization**

---

## 🎯 Architectural Principles

### 1. **Separation of Concerns**
Each layer has ONE responsibility. No mixing concerns.

### 2. **Dependency Inversion**
High-level modules depend on abstractions, not implementations.

### 3. **Fail Fast**
Validate early, fail explicitly. Don't let errors propagate.

### 4. **Circuit Breakers**
Prevent cascading failures. Fallback strategies.

### 5. **Observability First**
Log everything. Measure everything. Debug with data.

### 6. **Configuration Over Code**
Make decisions in config, not hardcoded.

### 7. **Testability**
Mock everything. Unit test in isolation. Integration test flows.

### 8. **Scalability by Design**
Don't optimize prematurely, but don't paint into corners.

---

## 📝 Notes

- **Phase 2 is NOT just "add PostgreSQL and Pinecone"** - It's a complete architectural overhaul
- **Start with interfaces** - Implement after interfaces are stable
- **Test migration path** from Pinecone to Qdrant before you're locked in
- **Monitor everything from day one** - You can't optimize what you don't measure
- **Keep API gateway thin** - Business logic belongs in services
- **Queue everything slow** - Don't block the API

---

**Document Version:** 2.0  
**Architect:** Senior Backend Architect  
**Status:** Ready for Implementation  
**Next Review:** After Phase 2 Milestone 1 (Week 4)
