# High-Level Design (HLD) - InvIQ Retail Chemist & Multi-Pharmacy Operating System

**Version:** 6.0  
**Last Updated:** August 16, 2026  
**Author:** Sayandip Bar

---

## 1. Problem Statement

Independent retail chemist shops and local pharmacy chains in Tier-2/3 cities lose substantial profit margins due to **expired medications (FEFO loss)**, sudden customer stockouts, and tedious distributor billing. Chemist owners rely on outdated software or manual registers, lacking real-time visibility across branches or connected counter scanning. **InvIQ automates this inventory with FEFO expiry tracking, millisecond barcode quick-dispensing, distributor Excel synchronization, and natural language AI queries.**

---

## 2. Who Are the Users?

### Primary Users
- **Pharmacy & Chemist Store Owners (Admin)** - Own 1 to 5+ medical store counters; need live stock, zero expiry loss, and distributor oversight.
- **Medicine Distributors & Wholesalers (Vendors)** - Supply medicines and ingest delivery manifests via Excel/CSV.
- **Counter Pharmacists / Staff** - Use barcode scanners at billing counters for instantaneous 1-by-1 stock deduction.
- **Platform Super Admin** - Multi-tenant platform management and system governance.

### Pain Points Solved
- ❌ Medicine expiry on shelves → ✅ Proactive 30/60/90-day FEFO alerts for distributor returns
- ❌ Slow manual stock deduction → ✅ Millisecond Barcode / USB Scanner Quick Dispensing
- ❌ Fragmented distributor paper bills → ✅ 1-Click Excel delivery manifest ingestion
- ❌ Disconnected branch counters → ✅ Real-time multi-branch stock synchronization

---

## 3. System Overview

**InvIQ** is an AI-powered retail chemist and pharmacy inventory operating system that tracks medicine batches across pharmacy shops. It provides:

1. **Ultra-Fast Barcode Scanner Dispensing** - Instant 1-by-1 stock deduction on counter scan with zero latency.
2. **FEFO Expiry Loss Shield** - Proactive batch expiry tracking (30/60/90 days).
3. **Supplier / Distributor Management** - Direct vendor accounts for delivery manifest ingestion.
4. **Distributor Excel Ingestion** - Automatic live stock replenishment from wholesaler manifests.
5. **Real-Time Analytics & Unified Sticky Navbars** - Clean store breakdown, cold-chain fridge monitor, and critical shortage alerts.
6. **Multi-Tenancy & Tenant Data Isolation** - Scoped organization architecture supporting Single Pharmacy and Multiple Pharmacy tiers.


---

## 4. Scope

### ✅ In Scope
- Multi-location retail chemist & multi-pharmacy inventory tracking
- Instant 1-by-1 Barcode Quick Dispense (`/api/inventory/scan-dispense`)
- Proactive FEFO (First Expiry, First Out) 30/60/90-day expiry loss protection
- AI-powered natural language queries (English & Hindi voice via Sarvam AI)
- Requisition approval workflow & PO generation
- Wholesaler/Distributor Excel upload manifest integration & auto-generated PDF invoices
- Real-time stock alerts (WebSocket via Redis Pub/Sub) & Low-stock email alerts (SMTP)
- Role-based access control (4 roles: super_admin, admin, staff, vendor) + Guest Demo Mode
- Analytics dashboard with Upstash Redis caching & local in-memory fallback
- Multi-tenancy (organization isolation: Single Pharmacy & Multi-Pharmacy tiers)
- Audit logging for regulatory compliance
- Automated Celery Beat scheduled audits (FEFO, Stock shortage, Cold-Chain monitoring)


### ❌ Out of Scope
- Barcode/RFID scanning (future)
- Mobile app (web-responsive only)
- Automated reordering (manual approval required)
- Integration with ERP systems (future)
- Predictive analytics (ML models - future)
- Multi-language support (English only)
- Offline mode (requires internet)

---

## 5. System Architecture

### 5.1 Full-Stack Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer["🖥️ Client Layer (React 19 SPA)"]
        Landing["🌐 Public Portal & Onboarding Wizard"]
        AdminPort["🛡️ Chemist Admin Dashboard & Org Settings"]
        StaffPort["💊 Counter Staff Portal (Permitted Branches)"]
        VendorPort["🚚 Wholesaler / Distributor Manifest Portal"]
        BarcodeScanner["🔫 USB / Bluetooth / Camera Barcode Scanner"]
    end

    subgraph APIGateway["🚪 API Gateway & Security Perimeter (FastAPI)"]
        CORS["CORS & Host Whitelist"]
        SecHeaders["🛡️ Security Headers & Content Security Policy"]
        RateLimiter["⚡ SlowAPI Moving-Window Limiter (Upstash Redis)"]
        AuthGuard["🔑 JWT Authentication & Token Blacklist"]
        TenantResolver["🏢 Multi-Tenant Scoping Engine (org_id Enforcer)"]
        RESTEngine["REST API Routing (60+ Scoped Endpoints)"]
        GQLAnalytics["GraphQL Analytics Subgraph (/graphql/analytics)"]
        WSAlerts["WebSocket Event Stream (/ws/alerts)"]
    end

    subgraph BusinessLayer["⚙️ Domain & Application Layer"]
        InvService["InventoryService & Barcode Dispenser<br/>• Batch-Aware FEFO Deductions<br/>• Redis Distributed Locking (SETNX)"]
        AnalyticsService["AnalyticsService & Stockout Shield<br/>• 30/60/90 Day Expiry Forecasting<br/>• Tenant-Scoped Cache Keys"]
        ReqService["RequisitionService<br/>• Store Requisitions State Machine<br/>• Atomic Deductions on Fulfillment"]
        VendorService["VendorService<br/>• Excel Manifest Processing<br/>• PDF Invoices to Azure Blob"]
        DataImportService["DataImportService<br/>• 2-Pass AI / Synonym Mapping<br/>• Quarantine Error Storage"]
        AgentService["AgentService & ReAct Chatbot<br/>• LangGraph Multi-Step Reasoning<br/>• Multilingual Voice STT (Sarvam)"]
        ReportService["ReportService & PdfService<br/>• Vector PDF Compilations (ReportLab)"]
        NotificationService["NotificationService<br/>• Scoped Low-Stock Mailings (SMTP)"]
        CacheService["CacheService<br/>• L1 Memory + L2 Upstash REST<br/>• Non-blocking Pattern Invalidation"]
    end

    subgraph BackgroundWorkers["⚡ Celery Background Task Queues"]
        CeleryWorker["Celery Worker Engine (Redis Broker)"]
        TaskImport["📄 Bulk CSV Import Task"]
        TaskInvoice["🧾 PDF Invoice Generation Task"]
        TaskVector["🧠 Vector Embeddings Sync Task"]
        TaskEmail["📧 Transactional Email Task"]
        CeleryBeat["⏰ Celery Beat Scheduled Audits<br/>• FEFO Expiry Checks (6h)<br/>• Stock Shortage Audits (1h)<br/>• Cold-Chain Monitoring (30m)"]
    end

    subgraph DataPersistence["💾 Persistence & External Cloud Infrastructure"]
        PostgresDB[("🐘 PostgreSQL / Neon<br/>Strict org_id Row Isolation<br/>B-Tree & Composite Indexes")]
        UpstashRedis[("⚡ Upstash Redis<br/>• Distributed Lock (Redlock)<br/>• Token Blacklist & WS Tickets<br/>• Org Pub/Sub: inviq:events:org:{id}")]
        QdrantCloud[("🧠 Qdrant Cloud Vector DB<br/>Gemini 768-dim Embeddings<br/>Tenant Payload Filtering")]
        AzureStorage[("☁️ Azure Blob Storage<br/>Invoices, Reports & Manifests")]
        GroqLLM["⚡ Groq Cloud (LLaMA 3.3 70B)"]
        SarvamSTT["🎙️ Sarvam AI (Saaras v3 STT)"]
    end

    %% Client Layer to Gateway
    Landing --> CORS
    AdminPort --> CORS
    StaffPort --> CORS
    VendorPort --> CORS
    BarcodeScanner --> CORS
    CORS --> SecHeaders --> RateLimiter --> AuthGuard --> TenantResolver
    TenantResolver --> RESTEngine
    TenantResolver --> GQLAnalytics
    TenantResolver --> WSAlerts

    %% Gateway to Business Services
    RESTEngine --> InvService
    RESTEngine --> AnalyticsService
    RESTEngine --> ReqService
    RESTEngine --> VendorService
    RESTEngine --> DataImportService
    RESTEngine --> AgentService
    GQLAnalytics --> AnalyticsService
    WSAlerts --> InvService

    %% Services to Async Queues
    DataImportService -.-> TaskImport -.-> CeleryWorker
    VendorService -.-> TaskInvoice -.-> CeleryWorker
    AgentService -.-> TaskVector -.-> CeleryWorker
    NotificationService -.-> TaskEmail -.-> CeleryWorker
    CeleryBeat --> CeleryWorker

    %% Services to Storage & External
    InvService --> PostgresDB
    InvService --> UpstashRedis
    InvService --> CacheService
    AnalyticsService --> PostgresDB
    AnalyticsService --> CacheService
    CacheService --> UpstashRedis
    ReqService --> PostgresDB
    VendorService --> PostgresDB
    VendorService --> AzureStorage
    DataImportService --> PostgresDB
    AgentService --> GroqLLM
    AgentService --> QdrantCloud
    AgentService --> SarvamSTT
    ReportService --> PostgresDB
    NotificationService --> PostgresDB
```

---

### 5.2 Multi-Tenant Data Isolation Architecture

```mermaid
graph TD
    subgraph MultiTenantIsolation["🏢 Multi-Tenant Scoping Boundaries"]
        TenantHeader["Incoming Request with JWT / Ticket"]
        Context["Dependencies: get_current_user & get_caller_org_id"]
        
        subgraph IsolationGuards["Strict Invariants"]
            G1["1. Database: Model.org_id == caller_org_id"]
            G2["2. Cache: cache:{org_id}:* namespace"]
            G3["3. Pub/Sub: inviq:events:org:{org_id}"]
            G4["4. Vector RAG: Filter(org_id == caller_org_id)"]
            G5["5. Workers: Celery Task Payload (org_id required)"]
        end
        
        TenantHeader --> Context
        Context --> G1
        Context --> G2
        Context --> G3
        Context --> G4
        Context --> G5
    end
```

### 5.3 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **React Frontend** | Single responsive SPA (Desktop Sidebar / Mobile Bottom Nav), 4 role-based views (Super Admin, Admin, Staff, Vendor) + Guest Demo Mode, real-time WebSocket updates |
| **FastAPI Backend** | REST API (60+ endpoints), JWT authentication, business logic orchestration |
| **Domain Layer** | Repository protocols (Protocol classes), value objects (StockStatus, StockThresholds, ReorderPolicy), domain calculations |
| **GraphQL Layer (Strawberry)** | Read-only analytics API at `/graphql/analytics` — 5 queries, role-aware field masking, shared Redis cache with REST |
| **AI Agent Service** | LangGraph ReAct agent with 9 tools, natural language processing, voice transcription (Sarvam AI) |
| **Analytics Service** | Dashboard stats, heatmaps, critical alerts with Redis caching & local in-memory fallback |
| **Inventory Service** | High-speed barcode dispense, stock tracking, transaction management, reorder calculations, WebSocket alert triggers |
| **Requisition Service** | Approval workflow, status management, inventory updates |
| **Vendor Service** | Excel delivery manifest parsing, item matching, bulk transaction creation, auto-invoicing |
| **Celery Worker & Beat** | Scheduled background audits: FEFO expiry (every 6h), stock shortage (hourly), cold-chain monitor (every 30m) |
| **PostgreSQL** | Primary multi-tenant relational store (13 tables, DB Enums, composite indexes, Alembic migrations) |
| **Upstash Redis** | Distributed cache, Pub/Sub alert broker, token blacklist, login attempt tracking |
| **Qdrant Cloud** | Vector database for AI semantic memory and RAG context |


---

## 6. Detailed Request/Response Flows

### 6.1 User Authentication & Cookie Session Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant Web as 💻 React SPA
    participant AuthAPI as 🚪 Auth Controller (/api/auth/login)
    participant Lockout as ⚡ Upstash Redis (Lockout Tracker)
    participant DB as 🐘 PostgreSQL DB
    participant Audit as 📜 AuditService

    User->>Web: Submits credentials (username, password)
    Web->>AuthAPI: POST /api/auth/login
    AuthAPI->>Lockout: Check failed attempts (lockout:{username})
    alt Account is Locked (>5 failed attempts)
        Lockout-->>AuthAPI: 429 Too Many Requests
        AuthAPI-->>Web: Lockout notification (15m remaining)
    else Under Threshold
        AuthAPI->>DB: Fetch user by username
        alt User Exists & Password Valid (Argon2id)
            AuthAPI->>Lockout: Reset lockout attempts
            AuthAPI->>Audit: Record successful login
            AuthAPI-->>Web: 200 OK + Set-Cookie (access_token, refresh_token, HttpOnly, SameSite=Lax)
            Web->>Web: Store user profile & redirect to dashboard
        else Invalid Credentials
            AuthAPI->>Lockout: Increment failed attempts (INCR + EXPIRE 900)
            AuthAPI->>Audit: Record failed login attempt
            AuthAPI-->>Web: 401 Unauthorized ("Invalid credentials")
        end
    end
```

### 6.2 AI Chatbot Query & RAG Memory Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Chemist / Owner
    participant Web as 💻 React SPA
    participant ChatAPI as 🤖 Chat Controller (/api/chat/query)
    participant VectorDB as 🧠 Qdrant Cloud (Vector Store)
    participant Groq as ⚡ Groq Cloud (LLaMA 3.3 70B)
    participant Tools as ⚙️ Agent Tools (DB Queries)
    participant DB as 🐘 PostgreSQL DB

    User->>Web: Submits natural language question ("What items are near expiry?")
    Web->>ChatAPI: POST /api/chat/query { message, session_id }
    ChatAPI->>VectorDB: Semantic search (Filter: org_id == current_org)
    VectorDB-->>ChatAPI: Return top-3 relevant context chunks
    ChatAPI->>Groq: Prompt with System Rules, Vector Context & Conversation History
    Groq-->>ChatAPI: Tool Call: get_near_expiry_items(days=30, org_id=1)
    ChatAPI->>Tools: Execute get_near_expiry_items()
    Tools->>DB: Query inventory_transactions with expiry_date filter
    DB-->>Tools: 3 items expiring within 30 days
    Tools-->>ChatAPI: Formatted tool output
    ChatAPI->>Groq: Feed tool results back to LLM
    Groq-->>ChatAPI: Synthesized final answer with actionable recommendations
    ChatAPI->>DB: Save user & assistant messages to chat_messages
    ChatAPI->>VectorDB: Asynchronously embed & store new interaction
    ChatAPI-->>Web: 200 OK { response, suggested_actions }
```

### 6.3 Requisition Lifecycle Flow (`PENDING` → `APPROVED` → `FULFILLED`)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as 💊 Branch Staff
    actor Admin as 🛡️ Chemist Admin
    participant API as ⚡ FastAPI Backend
    participant DB as 🐘 PostgreSQL DB
    participant WS as 📡 WebSocket (Redis Pub/Sub)

    Staff->>API: POST /api/requisition/create { location_id, items: [...] }
    API->>DB: Verify branch access & insert Requisition (status: PENDING)
    DB-->>API: Requisition created (REQ-202608-001)
    API->>WS: Broadcast to org channel (inviq:events:org:1, topic: requisition.created)
    WS-->>Admin: Real-time UI notification on admin dashboard

    Admin->>API: PUT /api/requisition/{id}/approve
    API->>DB: Update status to APPROVED (record approved_by, approved_at)
    API->>WS: Broadcast requisition.approved
    WS-->>Staff: Real-time status update to branch counter

    Staff->>API: PUT /api/requisition/{id}/fulfill
    API->>DB: Atomic stock transaction: received += req.quantity on branch
    API->>DB: Update status to FULFILLED
    API-->>Staff: 200 OK (Stock updated & requisition closed)
```

### 6.4 Data Import & Quarantine Error Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 🛡️ Chemist Admin
    participant Web as 💻 React SPA
    participant API as ⚡ Data Import API
    participant AI as ⚡ AI / Synonym Mapper
    participant Celery as ⚡ Celery Worker
    participant DB as 🐘 PostgreSQL DB

    Admin->>Web: Uploads raw distributor CSV / Excel file
    Web->>API: POST /api/data-import/preview
    API->>AI: 2-Pass Heuristic & LLM column synonym detection
    AI-->>API: Suggested column mappings with confidence scores
    API-->>Web: Preview rows & mapping recommendations

    Admin->>Web: Confirms column mapping & clicks "Import"
    Web->>API: POST /api/data-import/confirm
    API->>Celery: Queue import_csv_task(org_id, job_id, file_path)
    Celery->>DB: Parse rows, validate schema & foreign keys
    alt Valid Row
        Celery->>DB: Insert / Update Item & Ledger Transaction
    else Invalid Row (Missing MRP, negative price, invalid date)
        Celery->>DB: Insert into import_quarantine table with error reason
    end
    Celery->>DB: Update DataImportJob status (COMPLETED / PARTIAL)
    Celery-->>Admin: WebSocket event: import.completed (Success: 98, Quarantined: 2)
```

### 6.5 Real-Time WebSocket & Redis Pub/Sub Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as 💻 React Client
    participant WSAPI as ⚡ WebSocket Endpoint (/ws/alerts)
    participant Redis as ⚡ Upstash Redis (Pub/Sub & Tickets)
    participant Backend as ⚙️ Domain Services

    Client->>WSAPI: POST /api/auth/ws-ticket (Authenticated via Cookie)
    WSAPI->>Redis: Generate single-use ticket (TTL: 30s)
    Redis-->>WSAPI: Ticket UUID: 4f2a-9e1b
    WSAPI-->>Client: Return { ticket: "4f2a-9e1b" }
    
    Client->>WSAPI: Connect wss://.../ws/alerts?ticket=4f2a-9e1b
    WSAPI->>Redis: Atomically validate & delete ticket (Single-use)
    WSAPI-->>Client: Connection Accepted (Assigned to Org Channel: inviq:events:org:1)

    Note over Backend,Redis: Domain Event Triggered (e.g. Stock Below Threshold)
    Backend->>Redis: PUBLISH inviq:events:org:1 { event: "stock.low", item: "Pan-D" }
    Redis-->>WSAPI: Subscriber receives message on inviq:events:org:1
    WSAPI-->>Client: Stream event JSON to active socket
```

---

## 7. Authentication & Authorization Architecture

### 7.1 JWT & Cookie Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as 💻 Browser Client
    participant Auth as 🚪 Auth Routes
    participant Guard as 🛡️ Auth Middleware
    participant Blacklist as ⚡ Upstash Redis Token Blacklist

    Note over Client,Auth: 1. Login & Token Issuance
    Client->>Auth: POST /api/auth/login
    Auth-->>Client: Set HttpOnly SameSite Cookies (access_token: 30m, refresh_token: 7d)

    Note over Client,Guard: 2. Authenticated API Request
    Client->>Guard: GET /api/inventory/summary (Cookies automatically attached)
    Guard->>Guard: Verify JWT signature & expiration
    Guard->>Blacklist: Check if token jti is blacklisted
    alt Token Active
        Guard-->>Client: 200 OK (Protected Data)
    else Token Revoked
        Guard-->>Client: 401 Unauthorized ("Token has been revoked")
    end

    Note over Client,Auth: 3. Logout & Token Revocation
    Client->>Auth: POST /api/auth/logout
    Auth->>Blacklist: SET blacklist:{access_jti} EX 1800
    Auth->>Blacklist: SET blacklist:{refresh_jti} EX 604800
    Auth-->>Client: Clear-Cookie & 200 OK
```

### 7.2 4-Tier Role Hierarchy & Permissions Matrix

```mermaid
graph TD
    subgraph RoleHierarchy["👑 4-Tier Role Hierarchy"]
        SuperAdmin["super_admin (Level 4 - Platform Governance)"]
        Admin["admin (Level 3 - Pharmacy / Chemist Store Owner)"]
        Staff["staff (Level 2 - Counter Pharmacist / Billing Staff)"]
        Vendor["vendor (Level 1 - Medicine Wholesaler / Distributor)"]
        
        SuperAdmin --> Admin
        Admin --> Staff
        Staff --> Vendor
    end
```

| Permission / Capability | `super_admin` | `admin` | `staff` | `vendor` |
|:---|:---:|:---:|:---:|:---:|
| **Multi-Tenant Org Creation & Provisioning** | ✅ | ❌ | ❌ | ❌ |
| **Pharmacy Settings & Branch Location Config** | ✅ | ✅ | ❌ | ❌ |
| **Staff & Supplier Account Management** | ✅ | ✅ | ❌ | ❌ |
| **Requisition Approvals & Rejections** | ✅ | ✅ | ❌ | ❌ |
| **Barcode Quick Dispense (`/scan-dispense`)** | ✅ | ✅ | ✅ (Assigned Branch) | ❌ |
| **Create Stock Requisitions** | ✅ | ✅ | ✅ (Assigned Branch) | ❌ |
| **Upload Wholesaler Excel Delivery Manifests** | ✅ | ✅ | ❌ | ✅ (Assigned Locations) |
| **Download PDF Delivery Invoices** | ✅ | ✅ | ❌ | ✅ (Own Invoices) |
| **View Audit Trail & System Security Logs** | ✅ | ✅ (Own Org) | ❌ | ❌ |

### 7.3 Multi-Tenancy Isolation Invariants

InvIQ enforces non-negotiable multi-tenant boundaries at every architectural layer:

1. **Database Tier**: Every tenant-owned table (`locations`, `items`, `inventory_transactions`, `requisitions`, `requisition_items`, `vendor_uploads`, `vendor_invoices`, `data_import_jobs`, `import_quarantine`, `chat_sessions`, `chat_messages`, `audit_logs`) has a non-nullable `org_id` column with composite B-Tree indexes (`(org_id, id)`, `(org_id, item_id, location_id)`).
2. **Context Resolution**: Routes resolve tenant identity via `current_user.org_id` (`get_caller_org_id` / `get_current_user`). If a non-superadmin user has `org_id is None`, all operations are strictly rejected (`403 Forbidden`).
3. **No Cross-Tenant Leaks**: Any attempt to read or mutate another tenant's resource returns `404 Not Found` or `403 Forbidden` without revealing whether the resource exists.
4. **Cache & Pub/Sub Isolation**: Redis cache keys (`cache:{org_id}:*`) and Pub/Sub event channels (`inviq:events:org:{org_id}`) are partitioned per tenant.
5. **Vector RAG Isolation**: Qdrant semantic searches apply metadata payload filtering (`Filter(must=[FieldCondition(key="org_id", match=MatchValue(value=org_id))])`) to guarantee that conversation memory and AI retrieval never cross tenant boundaries.

---


## 8. Tech Stack & Characteristics

### 8.1 Tech Stack Choices

#### Backend
| Technology | Why Chosen |
|------------|-----------|
| **FastAPI** | Async support, automatic OpenAPI docs, fast performance, Python ecosystem |
| **Strawberry GraphQL** | Code-first GraphQL for Python — integrates natively with FastAPI, supports role-aware resolvers and field-level nullable masking |
| **PostgreSQL** | ACID compliance, complex queries, JSON support, production-ready |
| **Alembic** | Database migration management for production-safe schema changes |
| **Upstash Redis** | Serverless Redis, REST API (no TCP), pay-per-request, global replication |
| **Qdrant Cloud** | Vector database for semantic search and RAG context storage |
| **LangGraph** | Orchestrates ReAct agent workflows and structures tool execution state machines |
| **Groq** | Ultra-fast LLM inference (LLaMA 3.3 70B), cost-effective |
| **Pydantic Settings** | Type-safe configuration management with `.env` file support and production validation |
| **Argon2 (pwdlib)** | GPU-resistant, memory-hard password hashing (PHC winner) |

#### Frontend
| Technology | Why Chosen |
|------------|-----------|
| **React 19** | Modern UI capabilities, component reusability, large ecosystem |
| **Vite** | Fast hot-reloading (HMR) and optimized build times |
| **Tailwind CSS** | Rapid and consistent responsive styling |
| **Recharts** | Fully interactive charts tailored for analytics dashboards |

#### Infrastructure
| Technology | Why Chosen |
|------------|-----------|
| **Neon** | Serverless PostgreSQL with auto-scaling, instant branching, and automatic backups |
| **Render.com** | Zero-downtime deployment, health checks, automatic SSL |
| **Docker** | Standardized, isolated container environments for local dev and testing |

### 8.2 System Characteristics

| Characteristic | Value | Notes |
|----------------|-------|-------|
| **Architecture** | Clean Architecture (Domain/Application/Infrastructure/API) | Modular monolith with DDD-inspired layering |
| **API Style** | REST + GraphQL + WebSocket | 56+ REST endpoints, 5 GraphQL queries, WebSocket alerts |
| **Database** | PostgreSQL (ACID) | 11 tables, Alembic migrations, connection retry with backoff |
| **Caching** | Redis (Upstash) | 2-5 min TTL, SCAN-based invalidation, shared between REST and GraphQL |
| **AI** | LangGraph ReAct | 9 tools, 30s timeout, voice STT (Sarvam AI, 22 languages) |
| **Auth** | JWT (HS256) + Argon2 | 30 min access, 7 days refresh, token rotation, timing-safe verification |
| **Rate Limiting** | slowapi (moving-window) | 5-60 req/min, Redis-backed (REST only) |
| **Real-time** | WebSocket | Location-based broadcasting, ping/pong heartbeat |
| **Deployment** | Docker multi-stage → Azure/Render | CI/CD via GitHub Actions |
| **Scaling** | Vertical | Add RAM/CPU to single instance |
| **Background Jobs** | Daemon Threads | In-process email dispatch |
| **Config** | Pydantic Settings v2 | Type-safe, multi-path .env, production validation |
| **External APIs** | Groq, LangSmith, Sarvam AI, Qdrant | LLM inference, observability, voice STT, vector storage |

### 8.3 External Integrations
- **Groq API:** Handles LLM inference for chatbot queries using `llama-3.3-70b-versatile`.
- **LangSmith:** Monitors chain execution and traces tool performance.
- **Sarvam AI:** Voice-to-text transcription (`saaras:v3`) supporting 22 Indian languages.
- **Qdrant Cloud:** Vector storage for chat memory and RAG context.
- **SMTP Server:** Dispatches automated emails for password resets, invites, and critical stock notifications.
- **Google OAuth:** Validates external credentials to log in social users.

---

## 9. Architectural Decisions

### 9.1 Why Modular Monolith Over Microservices?
- **Team Size:** A single developer maintains the system. Building and managing microservices would introduce substantial operational overhead (network overhead, service discovery, pipeline management).
- **Domain Coupling:** Inventory tracking, requisitions, and analytics are tightly coupled. Extracting services prematurely would necessitate distributed transactions (Sagas) and complicate data consistency.
- **Deployment Simplicity:** A single Render instance runs the server, avoiding multi-container orchestrations.
- **Cost:** Keeps infrastructure footprints low (single PostgreSQL pool, single cache pool).
- **Performance:** In-process function execution runs in nanoseconds, eliminating HTTP serialization latency between sub-modules.
- **Modular Boundaries:** Designed with clean separation to ease extraction to microservices if scaling demands dictate:
  ```
  backend/app/
  ├── api/              # API routes, Pydantic schemas, GraphQL
  ├── application/      # Service orchestration (inventory, requisition, agent, analytics, report)
  ├── domain/           # Core business rules, value objects, repository protocols
  └── infrastructure/   # Persistence, caching, database, vector store
  ```

### 9.2 Background Jobs & Task Queues
- **Decision:** **Lightweight Async Dispatch (In-Process Daemon Threads)**
- **Rationale:** External brokers like Celery/RabbitMQ are bypassed to avoid high infrastructure costs and deployment complexity. For SMTP operations (which block for 1–3 seconds), Python's `threading.Thread(daemon=True)` executes tasks asynchronously.
- **Error Handling:** Outages on the mail server or integrations log warnings in the background but do not affect or roll back database transactions.
- **Scale Plan:** If alert volumes scale to thousands per minute, a Redis-backed lightweight queue like **ARQ** or **Celery** will replace the thread executor to ensure persistence across container restarts.

### 9.3 Security Architecture Decisions

#### 9.3.1 Password Hashing: Argon2
Winner of the Password Hashing Competition (PHC). GPU-resistant and memory-hard, protecting users from dictionary attacks better than legacy algorithms (bcrypt, PBKDF2).

#### 9.3.2 Token Blacklist & Rate Limiting
A Redis cache registers blacklisted JWT access tokens upon logout. Endpoints use `slowapi` to impose strict request throttling (5/min for auth, 20/min for AI queries) to counter brute-force attempts and control LLM compute costs.

#### 9.3.3 Database-level Multi-Tenancy
Queries dynamically filter by `org_id` in the database query layer rather than application-level logic. This limits security drift risks compared to memory-based filters.

---

## 10. Deployment Architecture

### Local Development (Docker Compose)

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOCAL DEVELOPMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  docker compose up --build                                       │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  FastAPI Container    │  │  Cloud Services (external)       │ │
│  │  - Port 8000          │──│  - Neon PostgreSQL               │ │
│  │  - Gunicorn + Uvicorn │  │  - Upstash Redis                │ │
│  │  - 3 workers          │  │  - Qdrant Cloud                 │ │
│  │  - Health check       │  │  - Groq API                     │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Production (Azure Container Instance)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (Vercel)                                              │
│  - React SPA                                                    │
│  - CDN distribution                                             │
│  - Auto-deploy from GitHub                                      │
│                                                                  │
│  Backend (Azure Container Instance)                              │
│  - Docker multi-stage build                                     │
│  - ACR: inviqacr.azurecr.io                                     │
│  - 2 CPU / 4 GB RAM                                             │
│  - Auto-deploy via GitHub Actions CI/CD                          │
│  - Health checks on /health                                     │
│                                                                  │
│  Database (Neon PostgreSQL)                                      │
│  - Managed PostgreSQL                                           │
│  - Alembic migrations on startup                                │
│  - Automatic backups                                            │
│                                                                  │
│  Cache (Upstash Redis)                                          │
│  - Serverless Redis                                             │
│  - Global replication                                           │
│                                                                  │
│  Vector DB (Qdrant Cloud)                                       │
│  - Managed vector storage                                       │
│  - Semantic search for AI chatbot                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
git push main
    ↓
CI: pytest + docker build (GitHub Actions)
    ↓
CD: build image → push to ACR → deploy to Azure
    ↓
Live at http://inviq-api.eastasia.azurecontainer.io:8000
```

### Docker Multi-Stage Build

```
Stage 1 (Builder):
  python:3.11-slim
  - Install system deps (gcc, libpq-dev, libffi-dev)
  - Create virtual environment
  - Install CPU-only PyTorch (~200 MB vs 2 GB CUDA)
  - Install all Python dependencies

Stage 2 (Runner):
  python:3.11-slim
  - Copy venv from builder
  - Copy application code
  - Health check via curl
  - CMD: alembic upgrade head → gunicorn (3 workers)
```

---

## 11. Key Design Patterns

| Pattern | Where Used | Why |
|---------|-----------|-----|
| **Clean Architecture** | `backend/app/` — Domain/Application/Infrastructure/API layers | Enforces dependency rule: domain has zero infrastructure imports |
| **Repository Protocol** | `app/domain/interfaces.py` | Structural subtyping via `typing.Protocol` — services depend on contracts, not implementations |
| **Dependency Injection** | FastAPI `Depends()` in `app/core/dependencies.py` | Promotes loose coupling, facilitates unit testing through mock dependencies |
| **Service Layer** | `app/application/` services | Isolates transactional orchestrations from routing logic |
| **Value Objects** | `app/domain/value_objects.py` — StockStatus, StockThresholds, ReorderPolicy | Immutable, behaviour-rich types encoding business rules |
| **ReAct Agent** | Chat system (`agent_service`) | LLM reasoning-action loop with 9 inventory tools |
| **CQRS (Light)** | Dashboard analytics — REST + GraphQL reads separated from writes | Isolates write operations from read-heavy analytics |
| **Event-driven** | WebSocket modules | Pushes live notifications to active frontends without polling |
| **Role-aware Resolvers** | GraphQL analytics layer | Field-level null masking enforces RBAC at the data layer |
| **Read-only Session Guard** | `agent_tools.py` — `ReadOnlySession` | Prevents AI agent from modifying database during tool execution |

---

## 12. Non-Functional Requirements

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| **Availability** | 99.5% uptime | Health checks, database retry with exponential backoff (3 attempts), Redis graceful fallback, Alembic migrations |
| **Performance** | < 200ms API response | Redis caching (2-5 min TTL), database indexing, connection pooling (5-10), N+1 query prevention |
| **Scalability** | 100 concurrent users | Stateless backend, async FastAPI, connection pool sizing, moving-window rate limiting |
| **Security** | OWASP Top 10 compliance | Argon2 hashing, JWT type enforcement + blacklisting, RBAC (6 tiers), timing-safe auth, PII masking, rate limiting |
| **Data Integrity** | Zero data loss | PostgreSQL ACID transactions, foreign key constraints, atomic requisition approval, Alembic migrations |
| **Observability** | Full execution tracing | Structured JSON logging, unique `X-Request-ID` headers, optional LangSmith tracing |
| **Config Safety** | Production validation | Pydantic Settings with `@model_validator` — blocks startup on insecure SECRET_KEY in production |

---

## 13. Scalability & Data Flow Patterns

### 13.1 Data Flow Patterns

#### Read-Heavy (Analytics — REST)
```
Request → Check Redis cache → If miss, query DB → Cache result → Return
```

#### Read-Heavy (Analytics — GraphQL)
```
Request → JWT optional auth → Check Redis (shared keys) → If miss, call AnalyticsService
       → Apply role-aware field masking → Return typed Strawberry objects
```

#### Write-Heavy (Inventory Transactions)
```
Request → Validate → Write to DB → Invalidate cache (analytics:*) → Audit log → WebSocket broadcast
```

#### AI Query (RAG)
```
Request → Load history → Query vector DB → Build context → LLM inference → Save response
```

#### Real-time (WebSocket)
```
Event → WebSocket manager → Broadcast to location → All clients receive
```

### 13.2 Scalability Considerations
- **Neon PG Limits:** Free tier constraints (~500MB DB capacity, 20 max pool connections). Vertical scale triggers are defined when telemetry indicators show connection exhausts.
- **WebSocket Broadcasting:** Single-instance dependent. To expand horizontally, a Redis Pub/Sub adapter will distribute messages to WebSocket listeners across cluster nodes.
- **LLM Rate Throttling:** Groq limits LLM throughput. Production mitigations involve queuing, failover LLMs (e.g. Gemini, OpenAI), and aggressive semantic caching of common questions.

---

## 14. Future Enhancements

### Phase 2 (Next 6 months)
- Barcode scanning integration (mobile camera parsing)
- Predictive analytics (ML models for demand forecasting)
- Mobile app (React Native port)
- Automated reordering based on thresholds
- Integration with hospital ERP systems

### Phase 3 (Next 12 months)
- Multi-language support
- Advanced reporting (custom dashboards)
- Supplier management portal
- Batch/lot tracking for compliance
- Expiry date management

---

## 15. Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **User Adoption** | 80% of staff using daily | TBD |
| **Stockout Reduction** | 50% fewer critical stockouts | TBD |
| **Time Saved** | 10 hours/week per manager | TBD |
| **AI Accuracy** | 90% correct answers | TBD |
| **System Uptime** | 99.5% | TBD |
| **Response Time** | < 200ms (p95) | TBD |

---

**Document Status:** ✅ Complete  
**Last Reviewed:** July 24, 2026  
**Next Review:** Every 3 months
