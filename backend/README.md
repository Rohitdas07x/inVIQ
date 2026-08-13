# 🏥 InvIQ Backend API & Architecture

The **InvIQ Backend** is a high-performance, multi-tenant inventory intelligence engine designed for wholesale healthcare networks, central pharmaceutical warehouses, and hospital supply chains.

---

## 🏗️ Backend System Architecture

```mermaid
graph TB
    subgraph Clients["📱 Client & Frontend Traffic"]
        Browser["React 19 Frontend SPA"]
        CLI["Automation Scripts / Postman"]
    end

    subgraph EntryPoint["🚪 API Gateway & Middleware Layer (FastAPI)"]
        CorsMW["CORS & Trusted Hosts"]
        RateLimit["SlowAPI Distributed Rate Limiter<br/>(Upstash Redis Backend)"]
        AuthGuard["JWT & RBAC Security Layer<br/>(Argon2id + Blacklist Store)"]
        
        RestRouter["REST API Router (56 Endpoints)<br/>/api/inventory, /api/requisition, /api/vendor..."]
        GqlRouter["GraphQL Router (Strawberry)<br/>/graphql/analytics (Field Masking)"]
        WsRouter["WebSocket Server<br/>/ws/alerts (Real-Time Stock Stream)"]
    end

    subgraph AppServices["⚙️ Domain & Application Layer"]
        InvService["InventoryService<br/>• Stock Balance Validation<br/>• O(1) Pre-fetched Ingestion"]
        AnalyticsService["AnalyticsService<br/>• Heatmap Calculation<br/>• Stock Depletion Forecasting"]
        ReqService["RequisitionService<br/>• Approval Lifecycle State Machine<br/>• Atomic Transaction Flush"]
        VendorService["VendorService<br/>• Delivery Manifest Parsing<br/>• Auto Delivery Invoices"]
        DataImportService["DataImportService<br/>• Groq LLM Column Mapping<br/>• Confidence Gating & Quarantine"]
        PdfService["InvoicePdfService & ReportService<br/>• ReportLab Vector PDF Engine"]
        NotifyService["NotificationService<br/>• SMTP Background Mailer<br/>• Welcome & Stockout Alerts"]
        AgentService["AgentService & ReAct Tools<br/>• LangGraph Conversation Engine<br/>• Sarvam Voice STT"]
        CacheService["CacheService<br/>• Redis Tagged Key Caching<br/>• Invalidation Patterns"]
    end

    subgraph Persistence["💾 Persistence & Infrastructure Layer"]
        DB[("🐘 PostgreSQL / Neon / Supabase<br/>• Composite B-Tree Indexes<br/>• Alembic Migrations")]
        RedisStore[("⚡ Upstash Redis<br/>• Distributed Token Blacklist<br/>• Analytics & Lookup Cache")]
        QdrantStore[("🧠 Qdrant Cloud Vector DB<br/>• Google Gemini 768-dim Embeddings<br/>• RAG Conversation Memory")]
        AzureStore[("☁️ Azure Blob Storage<br/>• inviq-documents Container<br/>• Invoices, Reports & Manifests")]
        GroqEngine["⚡ Groq Cloud (LLaMA 3.3 70B)"]
        SarvamEngine["🎙️ Sarvam AI (Saaras v3 STT)"]
    end

    Browser --> CorsMW
    CLI --> CorsMW
    CorsMW --> RateLimit --> AuthGuard
    AuthGuard --> RestRouter
    AuthGuard --> GqlRouter
    AuthGuard --> WsRouter

    RestRouter --> InvService
    RestRouter --> AnalyticsService
    RestRouter --> ReqService
    RestRouter --> VendorService
    RestRouter --> DataImportService
    RestRouter --> AgentService
    GqlRouter --> AnalyticsService
    WsRouter --> InvService

    InvService --> DB
    AnalyticsService --> DB
    AnalyticsService --> CacheService
    CacheService --> RedisStore
    ReqService --> DB
    VendorService --> DB
    VendorService --> PdfService
    VendorService --> AzureStore
    DataImportService --> GroqEngine
    DataImportService --> DB
    AgentService --> GroqEngine
    AgentService --> QdrantStore
    AgentService --> SarvamEngine
    NotifyService --> DB
```

---

## 👥 Role-Based Access Control (RBAC) & Execution Hierarchy

```mermaid
graph TD
    subgraph RoleHierarchy["👑 Role Hierarchy & Access Levels"]
        SuperAdmin["👑 Super Admin (Level 5)"]
        Admin["🛡️ Org Admin (Level 4)"]
        Manager["📊 Manager (Level 3)"]
        Staff["📦 Staff (Level 2)"]
        Vendor["🚚 Vendor (Level 1)"]
        Guest["👀 Guest / Demo (Level 0)"]
    end

    subgraph Actions["⚡ Capabilities & Permitted Endpoints"]
        SuperAction["• Create & manage organizations<br/>• Global multi-tenant audit logs<br/>• Organization admin provisioning"]
        AdminAction["• User creation & role management<br/>• System-wide audit inspection<br/>• Generate ReportLab PDF reports<br/>• Inventory reset & catalog controls"]
        ManagerAction["• Requisition approval & rejection<br/>• Unmasked forecasting metrics<br/>• Low-stock email dispatch"]
        StaffAction["• Inbound & outbound transactions<br/>• Submit stock requisitions<br/>• Location stock lookups"]
        VendorAction["• Upload Excel delivery manifests<br/>• Auto-generate delivery invoices<br/>• Download invoice PDFs (Azure Blob)"]
        GuestAction["• Browse public stock health<br/>• View heatmaps (masked forecast)<br/>• Interactive actions prompt login"]
    end

    SuperAdmin -->|Inherits all| Admin
    Admin -->|Inherits all| Manager
    Manager -->|Inherits all| Staff
    Staff -->|Basic write| Actions
    Vendor -->|Isolated vendor access| Manifests[Vendor Endpoints]
    Guest -->|Public read-only| Public[Guest Endpoints]

    SuperAdmin -.-> SuperAction
    Admin -.-> AdminAction
    Manager -.-> ManagerAction
    Staff -.-> StaffAction
    Vendor -.-> VendorAction
    Guest -.-> GuestAction
```

---

## ⚡ Performance Architecture & Indexing

The database is built with composite and single B-Tree indexes for high-concurrency throughput:

| Table | Index Name | Indexed Columns | Optimization Purpose |
|:---|:---|:---|:---|
| **`inventory_transactions`** | `ix_inv_tx_loc_item_date` | `(location_id, item_id, date)` | Turns transaction history lookups from $O(N)$ table scans to instant $O(\log N)$ index seeks. |
| **`inventory_transactions`** | `ix_inv_tx_item_date` | `(item_id, date)` | Accelerates item-level depletion forecasting. |
| **`requisitions`** | `ix_requisitions_status_urgency` | `(status, urgency)` | Enables instant filtering of emergency and pending requisitions. |
| **`requisitions`** | `ix_requisitions_loc_created` | `(location_id, created_at)` | Accelerates location-based requisition timelines. |
| **`requisition_items`** | `ix_req_items_req_item` | `(requisition_id, item_id)` | Eliminates sequence scans during nested joined loads. |
| **`chat_messages`** | `ix_chat_messages_session_created` | `(session_id, created_at)` | Speeds up multi-turn conversation retrieval. |
| **`audit_logs`** | `ix_audit_logs_action_created` | `(action, created_at)` | Fast compliance queries by action type. |
| **`users`** | `ix_users_role_active` | `(role, is_active)` | Consolidated $O(1)$ single-query dashboard counts. |

---

## 🚀 Running the Backend

### 1. Virtual Environment & Dependencies
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the root directory with the following keys:
```ini
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET_KEY=your-secure-jwt-secret-32-chars
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
GROQ_API_KEY=gsk_your_groq_key
SARVAM_API_KEY=your-sarvam-key
GEMINI_API_KEY=AIzaSy_your_gemini_key
QDRANT_URL=https://your-qdrant-cluster.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-api-key
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...
```

### 3. Migrations & Server Startup
```bash
# Apply database migrations
alembic upgrade head

# Launch development server
uvicorn app.main:app --reload --port 8000
```

### 4. Running Tests
```bash
pytest tests -v
```
