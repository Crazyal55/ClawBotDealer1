# Updated Task Schedule - Including Hybrid DB Architecture

## New Task Block: Database Architecture & RAG Prep

### Sprint: Hybrid Database Implementation ⏰ 1-2 weeks
**Priority:** 🔴 Critical (for Phase 2 SaaS)

#### Task: PostgreSQL Schema (3 days)
- [ ] Design full schema
  - `vehicles` table with all inventory fields
  - `dealers` table (multi-tenant)
  - `dealer_locations` table
  - `chats` table (for transcripts)
  - `chat_messages` table
- [ ] Add indexes
  - Price, year, make/model, dealer, availability
  - Composite indexes for common queries
- [ ] Add constraints
  - Foreign keys
  - Unique constraints (VINs)
  - Check constraints (quality score range)
- [ ] Create migrations
  - Version-controlled schema changes
  - Rollback scripts
- [ ] Set up Docker dev environment
  - PostgreSQL container
  - pgvector extension
  - Seed data for testing

**Deliverable:** Working PostgreSQL with full schema

---

#### Task: Vector Database Setup (3 days)
- [ ] Choose vector DB for MVP
  - Option A: pgvector (simpler, same DB)
  - Option B: Pinecone (managed, scalable)
  - Recommendation: Start with pgvector, migrate to Pinecone at 5k+ vehicles
- [ ] Set up embedding generation
  - OpenAI text-embedding-ada-002 integration
  - Batch embedding API calls
  - Error handling + retries
- [ ] Build ingestion pipeline
  - PostgreSQL → Vector DB sync
  - Handle inserts/updates/deletes
  - Real-time sync on new data
- [ ] Embedding strategy
  - What text to embed per vehicle?
  - Full description? Features only?
  - Marketing copy?

**Deliverable:** Vector DB with vehicle embeddings

---

#### Task: Hybrid Search Engine (4 days)
- [ ] Constraint extraction (NLP)
  - Parse user queries for price, year, body type, etc.
  - Extract context words ("reliable", "snowy", "family car")
  - Map to SQL WHERE clauses
- [ ] SQL query builder
  - Dynamic WHERE clause generation
  - Parameterized queries (security)
  - Filter by availability, dealer, quality
- [ ] Vector similarity search
  - Query vector from user input
  - Rank candidates by similarity
  - Return top N with scores
- [ ] Hybrid combination
  - SQL filter → Vector rank
  - Merge results
  - Return top 10
- [ ] Performance optimization
  - Target: < 100ms total latency
  - Query caching
  - Batch operations

**Deliverable:** Working hybrid search with < 100ms response

---

#### Task: Performance Testing (2 days)
- [ ] Load test with 1,000 vehicles
  - Measure latency
  - Measure accuracy
  - Identify bottlenecks
- [ ] Scale test to 10,000 vehicles
  - Same metrics
  - Find breaking point
- [ ] Benchmark vector DB options
  - pgvector vs. Pinecone
  - Cost vs. performance
  - Document recommendation

**Deliverable:** Performance benchmarks + scaling plan

---

## Updated Task Schedule (All Phases)

### Phase 1: Core Discovery & Testing (Weeks 1-2)
1. Discovery Strategy Research
2. Location Extraction
3. Multi-Location Scraping
4. Test Case Management
5. Test Runner Engine
6. Pre-Built Test Suites

### Phase 2: Performance & Experiments (Weeks 3-4)
7. Performance Profiling
8. Load Testing Framework
9. Experiment Tracking
10. Experiment Reporting

### Phase 2.5: Database Architecture (Weeks 4-5) 🔴 NEW
11. PostgreSQL Schema Design
12. Vector Database Setup
13. Hybrid Search Engine
14. Performance Testing (Hybrid Search)

### Phase 3: Data & Integration (Weeks 5-7)
15. Data Export for Training
16. Data Cleaning Tools
17. Quality Dashboard
18. API Documentation
19. UI/UX Polish

### Phase 4: Chatbot Testing Prep (Weeks 7-9)
20. Knowledge Base Testing Framework
21. Chat Simulation Tests
22. Scheduled Scraping
23. Webhook Integrations

---

## Updated Timeline

| Phase | Weeks | Tasks |
|--------|--------|--------|
| Phase 1 | 1-2 | Discovery + Testing |
| Phase 2 | 3-4 | Performance + Experiments |
| **Phase 2.5** | **4-5** | **Hybrid DB Architecture** 🔴 |
| Phase 3 | 5-7 | Data + Integration |
| Phase 4 | 7-9 | Chatbot Testing Prep |

**Total:** 9 weeks (added 1 week for DB architecture)

---

## Why This Priority

Hybrid DB is **critical for Phase 2 SaaS** because:

1. **Chatbot depends on it:** RAG needs structured + semantic search
2. **Must be designed early:** Hard to change later
3. **Performance testing takes time:** Need to validate scale
4. **Deployment depends on it:** Can't deploy SaaS without DB

---

## Tasks Reordered by Impact

### 🔴 Critical (Must Have for MVP)
1. PostgreSQL Schema (foundation)
2. Hybrid Search Engine (core chatbot feature)
3. Discovery Strategy (scraping foundation)
4. Location Extraction (multi-dealer support)
5. Test Case Management (R&D tooling)

### 🟡 High (Important for Launch)
6. Vector Database Setup
7. Multi-Location Scraping
8. Performance Testing (Hybrid Search)
9. Test Runner Engine
10. Data Export for Training

### 🟢 Medium (Polish + Enhancement)
11. Performance Profiling (current scraper)
12. Experiment Tracking
13. Data Cleaning Tools
14. Quality Dashboard
15. API Documentation
16. UI/UX Polish

---

## Immediate Priority

**Start with either:**

**Option A:** PostgreSQL Schema (Chatbot foundation)
- 3 days
- Critical for Phase 2
- Test with mock data

**Option B:** Discovery Strategy (R&D tool)
- 1-2 days
- Start scraping real data
- Build test datasets

**My vote:** Start with PostgreSQL Schema
- R&D tool can use it for testing
- Chatbot foundation ready early
- Can load scraped data directly into production schema

---

**Which should I start?** Or do you want both in parallel? 🎯
