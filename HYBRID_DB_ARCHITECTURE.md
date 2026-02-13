# Hybrid Database Architecture - RAG Chatbot

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL (Relational)                             │
│  ─────────────────────────                          │
│  Single Source of Truth                               │
│  ─────────────────────────                          │
│  Structured Inventory Data:                            │
│  ├─ price                                             │
│  ├─ year                                              │
│  ├─ mileage                                            │
│  ├─ make, model, trim                                   │
│  ├─ drivetrain                                         │
│  ├─ body_type                                         │
│  ├─ dealer_location                                     │
│  ├─ availability                                       │
│  └─ quality_score                                      │
│                                                      │
│  Benefits:                                             │
│  ✅ Fast filtering                                      │
│  ✅ Efficient sorting                                    │
│  ✅ Transactional consistency                             │
│  ✅ ACID guarantees                                    │
│  ✅ SQL joins and relationships                           │
└─────────────────────────────────────────────────────────┘
                          ↓
                   Hybrid Search
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Vector Database (Embeddings)                           │
│  ─────────────────────────                          │
│  Semantic Search & Intent-Based Ranking                 │
│  ─────────────────────────                          │
│  Vector Embeddings per Vehicle:                        │
│  ├─ Full vehicle description                          │
│  ├─ Features list                                    │
│  ├─ Make/model context                               │
│  ├─ Body type characteristics                          │
│  ├─ Performance specs (if available)                  │
│  └─ Marketing language from listing                     │
│                                                      │
│  Benefits:                                             │
│  ✅ Semantic understanding                             │
│  ✅ Intent-based ranking                              │
│  ✅ Natural language queries                           │
│  ✅ Similarity scoring                               │
│  ✅ RAG retrieval accuracy                            │
└─────────────────────────────────────────────────────────┘
```

---

## Hybrid Search Workflow

### User Query: "a reliable SUV for snowy commutes under $30k"

```
Step 1: Constraint Extraction (NLP)
├─ Body type: SUV
├─ Price: ≤ $30,000
├─ Context: "reliable" (maybe quality score, AWD/4WD)
└─ Context: "snowy commutes" (AWD, winter tires mentioned)
         ↓
Step 2: SQL Filtering (PostgreSQL)
├─ SELECT * FROM vehicles
├─ WHERE body_type = 'SUV'
├─ AND price <= 30000
├─ AND drivetrain IN ('AWD', '4WD')  // extracted from context
├─ AND quality_score >= 80  // "reliable"
├─ AND availability = true
└─ LIMIT 500
         ↓
Result: 187 candidate vehicles
         ↓
Step 3: Vector Similarity (Vector DB)
├─ Query vector: "reliable SUV snowy commutes"
├─ Compute similarity for all 187 candidates
├─ Rank by cosine similarity
└─ Return top 10
         ↓
Step 4: Final Results
├─ 10 vehicles shown to user
├─ Ranked by relevance + filtered by constraints
└─ Low latency (SQL first, vector second)
```

---

## Database Schema

### PostgreSQL (Structured Data)

```sql
-- Vehicles Table
CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    vin VARCHAR(17) UNIQUE,
    year INTEGER,
    make VARCHAR(100),
    model VARCHAR(100),
    trim VARCHAR(100),
    price DECIMAL(10,2),
    mileage INTEGER,
    drivetrain VARCHAR(20),
    body_type VARCHAR(50),
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    
    -- Dealer Info
    dealer_id BIGINT REFERENCES dealers(id),
    dealer_location_id BIGINT REFERENCES dealer_locations(id),
    
    -- Metadata
    availability BOOLEAN DEFAULT true,
    quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
    scraped_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for fast filtering
    INDEX idx_price (price),
    INDEX idx_year (year),
    INDEX idx_make_model (make, model),
    INDEX idx_dealer (dealer_id),
    INDEX idx_availability (availability),
    INDEX idx_quality (quality_score)
);

-- Dealers Table
CREATE TABLE dealers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200),
    website_url VARCHAR(500),
    business_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dealer Locations Table
CREATE TABLE dealer_locations (
    id BIGSERIAL PRIMARY KEY,
    dealer_id BIGINT REFERENCES dealers(id),
    name VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    UNIQUE(dealer_id, name)
);
```

### Vector Database (Embeddings)

```javascript
// Document format for each vehicle
{
  id: "vehicle_id",  // References PostgreSQL
  vector: [0.123, -0.456, ...],  // 1536-dim vector (OpenAI)
  text: "2023 Toyota RAV4 Limited AWD SUV with leather interior...",
  metadata: {
    make: "Toyota",
    model: "RAV4",
    year: 2023,
    body_type: "SUV",
    drivetrain: "AWD",
    price: 32000
  }
}
```

---

## Tech Stack Options

### PostgreSQL
- **Recommended:** PostgreSQL 15+
- **Extensions:**
  - `pgvector` for vector operations (alternative to separate DB)
  - PostGIS for geospatial queries (nearby dealers)
- **Hosting:**
  - Dev: Local Docker
  - Prod: Azure Database for PostgreSQL, AWS RDS, or managed PostgreSQL

### Vector Database Options

#### Option 1: pgvector (Single DB)
```
Pros:
├─ Single database (simpler)
├─ ACID guarantees
├─ SQL joins with vectors
└─ Lower latency (no network calls)

Cons:
└─ Limited vector features vs. specialized DB

Use case: Start here, upgrade if needed
```

#### Option 2: Pinecone (Managed Vector DB)
```
Pros:
├─ Fully managed
├─ Scalable to millions of vectors
├─ Great performance
└─ Easy integration

Cons:
├─ Separate from PostgreSQL (network latency)
├─ Additional cost
└─ Vendor lock-in

Use case: Production scale (10k+ vehicles)
```

#### Option 3: Qdrant (Open Source Vector DB)
```
Pros:
├─ Open source (self-host)
├─ High performance
├─ Rich filtering API
└─ No vendor lock-in

Cons:
├─ Self-managed
└─ Separate infrastructure

Use case: Cost-conscious, control over data
```

#### Option 4: Weaviate (Knowledge Graph + Vectors)
```
Pros:
├─ Knowledge graph built-in
├─ Semantic search + relationships
├─ GraphQL API
└─ Great for RAG

Cons:
└─ Steeper learning curve

Use case: Advanced RAG with relationships
```

---

## Scaling Path

### Development (VPS)
```
PostgreSQL: Docker container
Vector DB: pgvector (same DB)
Vehicles: Hundreds to low thousands
Latency: < 100ms
Cost: $20-50/month (VPS)
```

### Production (Azure)
```
PostgreSQL: Azure Database for PostgreSQL
Vector DB: Pinecone (managed) or pgvector
Vehicles: Tens of thousands
Latency: < 50ms
Cost: $100-500/month (scale as needed)
```

### Enterprise Scale
```
PostgreSQL: Azure Flexible Server
Vector DB: Pinecone Starter/Production
Vehicles: Hundreds of thousands
Latency: < 30ms
Cost: $500-2000/month
```

---

## Implementation Tasks

### Task 1: PostgreSQL Schema Design
- [ ] Define full schema (vehicles, dealers, locations, chats)
- [ ] Add indexes for filtering
- [ ] Add constraints and relationships
- [ ] Create migration scripts
- [ ] Set up in Docker (dev)

### Task 2: Vector Integration
- [ ] Choose vector DB (recommend: pgvector for MVP)
- [ ] Set up embedding generation (OpenAI API)
- [ ] Build ingestion pipeline
- [ ] Sync PostgreSQL → Vector DB on new data
- [ ] Handle updates/deletes

### Task 3: Constraint Extraction (NLP)
- [ ] Build constraint parser
- [ ] Extract: price, year, body_type, drivetrain
- [ ] Extract: context words ("reliable", "snowy")
- [ ] Map to SQL WHERE clauses

### Task 4: Hybrid Search Engine
- [ ] Build SQL query builder
- [ ] Add vector similarity search
- [ ] Combine: SQL filter → Vector rank
- [ ] Return top N results with metadata
- [ ] Measure latency (target: < 100ms)

### Task 5: Performance Optimization
- [ ] Add query caching
- [ ] Optimize SQL indexes
- [ ] Batch vector queries
- [ ] Implement connection pooling
- [ ] Load test with 10k+ vehicles

### Task 6: Production Deployment (Azure)
- [ ] Set up Azure PostgreSQL
- [ ] Configure pgvector or Pinecone
- [ ] Set up VPC/peering
- [ ] Configure backups
- [ ] Set up monitoring
- [ ] Disaster recovery plan

---

## Hybrid Search Pseudocode

```javascript
async function hybridSearch(userQuery) {
  // Step 1: Extract constraints
  const constraints = await extractConstraints(userQuery);
  // { bodyType: 'SUV', priceMax: 30000, drivetrain: ['AWD', '4WD'] }

  // Step 2: SQL filtering (PostgreSQL)
  const candidates = await db.query(`
    SELECT * FROM vehicles
    WHERE body_type = $1
    AND price <= $2
    AND drivetrain = ANY($3)
    AND availability = true
    AND quality_score >= 80
    LIMIT 500
  `, [constraints.bodyType, constraints.priceMax, constraints.drivetrain]);

  // Step 3: Vector similarity (rank candidates)
  const queryVector = await getEmbedding(userQuery);
  const ranked = await vectorDB.search({
    queryVector,
    filter: { id: candidates.map(c => c.id) },
    limit: 10
  });

  // Step 4: Combine with full data
  const results = candidates
    .filter(c => ranked.find(r => r.id === c.id))
    .map(c => ({
      ...c,
      relevanceScore: ranked.find(r => r.id === c.id).score
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, 10);
}
```

---

## Metrics to Track

### Performance
- Query latency (p50, p95, p99)
- SQL query time
- Vector search time
- Total response time
- Cache hit rate

### Accuracy
- Relevance score (human-rated)
- Conversion rate (relevant cars → clicked/bought)
- Constraint satisfaction (did we respect all filters?)

### Scale
- Vehicle count (hundreds → thousands → millions)
- Query volume (QPS)
- Database size
- Vector index size

---

## Upgrade Path

```
MVP: pgvector (single DB)
   ↓ Scale to 5k vehicles
Production: Pinecone (managed)
   ↓ Scale to 50k vehicles
Enterprise: Weaviate (knowledge graph)
   ↓ Scale to 500k+ vehicles
Custom: Hybrid of all
   ↓ Maximum flexibility
```

---

## Next Steps

### Phase 1: R&D Tool (Current)
- Build mock data generator
- Test hybrid search with synthetic data
- Compare pgvector vs. Pinecone
- Document performance benchmarks

### Phase 2: SaaS Platform (Future)
- Implement full schema
- Build ingestion pipeline
- Deploy to Azure
- Monitor at scale

---

## Questions

1. **Embedding Model:** OpenAI text-embedding-ada-002? Or custom?
2. **Vector DB Preference:** pgvector (simpler) or Pinecone (scalable)?
3. **Scale Targets:** How many vehicles per dealership? Total platform-wide?
4. **Deployment Timeline:** When do we move from VPS to Azure?
5. **Budget:** Monthly cost target for production?

---

## Benefits Summary

✅ **Low Latency:** SQL filters first, vectors second
✅ **High Accuracy:** Structured + semantic = best matches
✅ **Scalable:** Hundreds to millions of vehicles
✅ **Clean Upgrade Path:** pgvector → Pinecone → Weaviate
✅ **Single Source of Truth:** PostgreSQL for all data
✅ **RAG-Ready:** Vectors enable semantic search

---

**This is the foundation for AI-powered inventory chatbot.** 🚀
