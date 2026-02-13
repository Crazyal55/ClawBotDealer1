# Tech Stack - AI Dealership Platform

Version: 1.0  
Last Updated: February 13, 2026

---

## 📊 Executive Summary

The AI Dealership Platform uses a **modern, scalable stack** optimized for:
- **Fast development** (Phase 1: R&D)
- **Production-ready** (Phase 2: AI features)
- **Enterprise-grade** (Phase 3: SaaS platform)

**Core Philosophy:** Start simple, scale when needed. Phase 1 uses lightweight tools; Phase 2+ adds AI/ML infrastructure.

---

## 🚀 Technology Stack Overview

### Phase 1: Foundation (Current)

| Component | Technology | Version | Purpose |
|-----------|-----------|----------|---------|
| **Runtime** | Node.js | v22.22.0 | Server runtime |
| **Framework** | Express.js | v4.x | Web server & API |
| **Database** | SQLite3 | Latest | Local development |
| **Frontend** | HTML/CSS/JS (Vanilla) | - | Dashboard UI |
| **Scraping** | Axios + Cheerio | - | Web scraping |
| **Testing** | Node.js scripts | - | Test automation |
| **Environment** | Development (localhost) | - | R&D only |

### Phase 2: AI Features (Next)

| Component | Technology | Version | Purpose |
|-----------|-----------|----------|---------|
| **Database** | PostgreSQL | v15+ | Production DB |
| **Vector DB** | Pinecone / Qdrant | Latest | Semantic search |
| **Embeddings** | OpenAI text-embedding-ada-002 | - | Vector embeddings |
| **AI Model** | OpenAI GPT-4 | - | Chatbot & RAG |
| **Orchestration** | Node.js + Express | - | API layer |

### Phase 3: Platform (Later)

| Component | Technology | Version | Purpose |
|-----------|-----------|----------|---------|
| **Hosting** | Azure / VPS | - | Production deployment |
| **CDN** | Cloudflare | - | Static assets |
| **Authentication** | OAuth 2.0 | - | User accounts |
| **Monitoring** | Prometheus + Grafana | - | System metrics |
| **Cron** | GitHub Actions Cron | - | Scheduled tasks |

---

## 🔧 Detailed Technology Breakdown

### 1. Runtime & Framework

#### Node.js
**Version:** v22.22.0 (LTS)

**Why:**
- ✅ Fast, event-driven, non-blocking I/O
- ✅ Huge ecosystem (npm)
- ✅ Great for scraping (async/await)
- ✅ Easy deployment to any cloud
- ✅ TypeScript support (optional)

**Alternatives Considered:**
- Python - Better for ML, but slower web framework (Django/Flask)
- Go - Faster, but steeper learning curve
- Rust - Best performance, but overkill for this project

**Decision:** Node.js for rapid development + ecosystem maturity.

---

#### Express.js
**Version:** v4.x

**Why:**
- ✅ Minimal, unopinionated
- ✅ Huge middleware ecosystem
- ✅ Easy to learn
- ✅ Production-proven
- ✅ Great API routing

**Alternatives Considered:**
- Fastify - Faster, but smaller ecosystem
- Koa - More modern, but learning curve
- NestJS - Opinionated, overkill for Phase 1

**Decision:** Express.js for simplicity + flexibility.

---

### 2. Database Layer

#### SQLite (Phase 1)
**Purpose:** Local development, R&D, testing

**Why:**
- ✅ Zero configuration
- ✅ File-based (easy backup)
- ✅ Fast for small datasets (<10k records)
- ✅ No external dependencies
- ✅ Portable (single file)

**Limitations:**
- ❌ Single writer (no concurrent writes)
- ❌ No built-in replication
- ❌ Limited scalability
- ❌ No user permissions

**Decision:** SQLite for Phase 1 development speed.

---

#### PostgreSQL (Phase 2)
**Purpose:** Production database, multi-user, scalability

**Why:**
- ✅ ACID compliance (transaction safety)
- ✅ Concurrent writes
- ✅ Excellent performance with proper indexing
- ✅ Full-text search (pg_trgm)
- ✅ JSON support (JSONB)
- ✅ pgvector extension for vector similarity
- ✅ Production-proven, enterprise-ready
- ✅ Great backup/restore tools
- ✅ Replication and HA support

**Alternatives Considered:**
- MySQL - Similar, but pgvector is more mature
- MongoDB - Better for unstructured data, but weaker ACID
- TimescaleDB - Great for time-series, but overkill

**Decision:** PostgreSQL for Phase 2+ production.

---

### 3. AI/ML Infrastructure

#### Vector Database
**Options:**

**Pinecone (Primary Choice)**
- ✅ Fully managed
- ✅ Excellent performance
- ✅ Scales automatically
- ✅ Easy integration with OpenAI
- ❌ Cost increases with scale
- ❌ Vendor lock-in

**Qdrant (Alternative)**
- ✅ Open-source, self-hostable
- ✅ Cost-effective at scale
- ✅ Great performance
- ❌ Requires infrastructure management
- ❌ Self-hosted maintenance

**Decision:** Start with Pinecone (ease), evaluate Qdrant at scale.

---

#### Vector Embeddings
**Model:** OpenAI text-embedding-ada-002

**Why:**
- ✅ State-of-the-art performance
- ✅ Easy to use (OpenAI API)
- ✅ 1536 dimensions (good balance)
- ✅ Cost-effective (~$0.0001/1K tokens)
- ✅ Consistent, reliable

**Alternatives Considered:**
- Cohere - Cheaper, but less tested
- Sentence Transformers - Open-source, but self-hosted
- HuggingFace - Great models, but requires hosting

**Decision:** OpenAI for reliability + ease of integration.

---

#### LLM for Chatbot
**Model:** OpenAI GPT-4 (or GPT-3.5-turbo for cost optimization)

**Why:**
- ✅ Best-in-class reasoning
- ✅ Great context window
- ✅ Excellent for RAG systems
- ✅ Easy API integration
- ✅ Proven production use

**Alternatives Considered:**
- Claude (Anthropic) - Similar performance, but newer
- LLaMA - Open-source, but self-hosted
- PaLM (Google) - Good, but less API documentation

**Decision:** OpenAI GPT-4 for best RAG performance.

---

### 4. Web Scraping

#### Axios
**Purpose:** HTTP client for scraping

**Why:**
- ✅ Promise-based (async/await)
- ✅ Automatic JSON parsing
- ✅ Request/response interceptors
- ✅ Wide browser support
- ✅ Great error handling

**Alternatives Considered:**
- Fetch - Built-in, but less features
- Got - Better for Node, but Axios is more popular

**Decision:** Axios for ecosystem familiarity.

---

#### Cheerio
**Purpose:** HTML parsing and DOM traversal

**Why:**
- ✅ jQuery-like API (familiar)
- ✅ Fast parsing
- ✅ Lightweight
- ✅ Works with any HTML
- ✅ Great for scraping

**Alternatives Considered:**
- Puppeteer - Full browser, but heavy/slow
- Playwright - Modern, but overkill for scraping
- jsdom - Full DOM, but slower

**Decision:** Cheerio for speed + simplicity.

---

### 5. Frontend

#### Vanilla HTML/CSS/JavaScript
**Purpose:** Dashboard UI

**Why:**
- ✅ Zero build tools (no webpack/vite)
- ✅ Fast development
- ✅ Easy to debug
- ✅ No framework overhead
- ✅ Works everywhere

**Alternatives Considered:**
- React - Great, but overkill for this dashboard
- Vue.js - Simpler, but still framework
- Svelte - Modern, but learning curve
- Next.js - Too heavy for Phase 1

**Decision:** Vanilla for Phase 1 speed. Can add framework later if needed.

---

### 6. Deployment

#### Azure (Primary Choice)
**Purpose:** Production hosting

**Why:**
- ✅ Enterprise-grade reliability
- ✅ Great PostgreSQL support (Azure Database)
- ✅ Easy deployment (Azure DevOps)
- ✅ Great networking/CDN
- ✅ Good pricing tiers
- ✅ Great for startups (free credits)

**Alternatives Considered:**
- AWS - More options, but more complex
- Google Cloud - Great ML tools, but pricier
- VPS - Cheapest, but requires more management

**Decision:** Azure for ease of use + PostgreSQL support.

---

## 📦 Dependencies

### Core Dependencies (package.json)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "pg": "^8.11.3",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "openai": "^4.20.0",
    "@pinecone-database/pinecone": "^1.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🎯 Architecture Decisions

### Why This Stack?

#### 1. **Speed Over Complexity**
Phase 1 needs to move fast. SQLite + Vanilla JS = minimal overhead.

#### 2. **Scale When Needed**
Don't pay for complexity before it's needed. Add PostgreSQL, Vector DB only when traffic demands.

#### 3. **Vendor Lock-in Risk**
Minimize dependencies on proprietary tools. Use open-source where possible (Qdrant vs Pinecone).

#### 4. **Team Skills**
Node.js + Express is widely known. Easy to hire, easy to learn.

#### 5. **Cost Optimization**
- Start cheap (SQLite, Pinecone basic)
- Scale gradually (PostgreSQL, Qdrant self-hosted)

---

## 📊 Performance Benchmarks

### Expected Performance (Phase 1)

| Metric | Target | Technology |
|--------|--------|------------|
| API Response | <200ms | Express + SQLite |
| Database Query | <100ms | SQLite indexed |
| Scraping | <5s/car | Axios + Cheerio |
| Dashboard Load | <3s | Vanilla JS |

### Expected Performance (Phase 2)

| Metric | Target | Technology |
|--------|--------|------------|
| API Response | <100ms | Express + PostgreSQL |
| Vector Search | <200ms | Pinecone/Qdrant |
| Embedding | <500ms/doc | OpenAI API |
| RAG Response | <2s | GPT-4 + Vector DB |

---

## 🔐 Security Considerations

### Current (Phase 1)
- ✅ No secrets in code (use .env)
- ✅ Input validation on all API endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (can add express-rate-limit)

### Phase 2+
- 🔲 OAuth 2.0 authentication
- 🔲 API key encryption
- 🔲 HTTPS everywhere (TLS 1.3+)
- 🔲 Row-level security (PostgreSQL RLS)
- 🔲 Audit logging
- 🔲 Rate limiting per user

---

## 🚦 Migration Path

### Phase 1 → Phase 2

1. **SQLite → PostgreSQL**
   ```bash
   # Export SQLite
   sqlite3 cars.db .dump > dump.sql
   
   # Import to PostgreSQL
   psql -U user -d database < dump.sql
   ```

2. **Add Vector DB**
   - Initialize Pinecone collection
   - Batch embed existing data
   - Update API endpoints to use vector search

3. **Add AI Model**
   - Configure OpenAI API key
   - Implement RAG pipeline
   - Update chatbot endpoints

### Phase 2 → Phase 3

1. **Add Authentication**
   - OAuth 2.0 (Google/GitHub)
   - User management UI
   - Role-based access control

2. **Add Monitoring**
   - Prometheus metrics endpoint
   - Grafana dashboards
   - Alerting (email/Slack)

3. **Add CI/CD**
   - GitHub Actions workflows
   - Automated testing
   - Automated deployment

---

## 💰 Cost Estimation

### Phase 1 (Development)
- **Hosting:** VPS ($5-10/month)
- **Database:** $0 (SQLite)
- **Total:** $5-10/month

### Phase 2 (Production - Small Scale)
- **Hosting:** Azure App Service ($20-50/month)
- **PostgreSQL:** Azure Database ($20-50/month)
- **Pinecone:** $70/month (1M vectors)
- **OpenAI API:** $20-50/month (depending on usage)
- **Total:** $130-170/month

### Phase 3 (Production - Medium Scale)
- **Hosting:** Azure App Service Scale ($100-200/month)
- **PostgreSQL:** Azure Database ($50-100/month)
- **Qdrant:** Self-hosted (server cost: $30-50/month)
- **OpenAI API:** $100-500/month (depending on usage)
- **CDN/Cloudflare:** Free tier
- **Monitoring:** $20/month
- **Total:** $300-850/month

---

## 🔄 Technology Debt & Risks

### Known Trade-offs

1. **Vanilla JS (Phase 1)**
   - Risk: Harder to maintain as UI grows
   - Mitigation: Add React/Vue when complexity increases

2. **Pinecone (Phase 2)**
   - Risk: Vendor lock-in, costs at scale
   - Mitigation: Plan migration to Qdrant

3. **Single Server (Phase 1)**
   - Risk: Single point of failure
   - Mitigation: Add load balancing in Phase 3

4. **No Authentication (Phase 1)**
   - Risk: No access control
   - Mitigation: Not needed for R&D

---

## ✅ Approval Checklist

Please review and approve:

- [ ] Node.js v22.22.0
- [ ] Express.js v4.x
- [ ] SQLite3 (Phase 1) → PostgreSQL (Phase 2)
- [ ] Axios + Cheerio for scraping
- [ ] Vanilla HTML/CSS/JS (Phase 1)
- [ ] Pinecone (Phase 2) → Qdrant (Phase 3)
- [ ] OpenAI GPT-4 + text-embedding-ada-002
- [ ] Azure hosting (Phase 3)

**Approved By:** _________________  
**Date:** _________________  
**Comments:** _________________

---

## 📝 Notes

- All technologies are production-proven
- Stack is designed to scale incrementally
- Vendor lock-in minimized where possible
- Cost optimization is a priority

**Next Steps After Approval:**
1. Confirm PostgreSQL hosting
2. Create Pinecone account
3. Get OpenAI API key
4. Set up Azure DevOps environment

---

**Document Version:** 1.0  
**Last Review:** February 13, 2026  
**Next Review:** Before Phase 2 launch
