# 🏥 InvIQ - AI-Powered Retail Chemist & Multi-Pharmacy Inventory Operating System

**Smart AI inventory, FEFO expiry loss prevention, barcode quick-dispensing, and distributor Excel synchronization for retail medical stores and pharmacy chains.**

---

## 🎯 Problem It Solves

Independent retail medical stores and local pharmacy chains in Tier-2/3 cities lose significant revenue every month due to **expired medications (FEFO loss)**, missed customer sales from sudden stockouts, and manual paper-heavy distributor bills. **InvIQ provides a simple, ultra-fast, mobile-friendly platform tailored specifically for chemist shop owners:**

1. **Zero Expiry Loss (FEFO)**: Real-time alerts at 30, 60, and 90 days before batch expiration so chemists can return stock to distributors on time.
2. **Instant Barcode Quick Dispense**: Connected USB/Bluetooth barcode scanner and camera dispense endpoint that removes sold items one-by-one with millisecond consistency.
3. **1-Click Distributor Bill Ingest**: Upload wholesaler Excel/CSV delivery manifests to auto-increment live stock in seconds.
4. **Single & Multi-Shop Chains**: Centralized dashboard to track stock across 1 to 10+ shop counters from a phone or tablet.

---

## 🛠️ Tech Stack

### Backend
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-Strawberry-E10098?logo=graphql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white)

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)

### AI & Barcode Infrastructure
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-FF6B00?logo=ai&logoColor=white)
![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-Saaras_v3_STT-7C3AED?logo=google&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Cloud_Vector_DB-DC2626?logo=database&logoColor=white)

---

## ✨ Key Capabilities

- ⚡ **Ultra-Fast Barcode Scanner Dispensing** - Instant 1-by-1 stock deduction on counter scan with zero latency.
- 📦 **FEFO Expiry Loss Shield** - Proactive batch alerts ensuring no expired medicine remains on shelves.
- 🚚 **Supplier & Distributor Management** - Direct vendor accounts for delivery manifest ingestion.
- 🤖 **AI Chemist Assistant** - Ask questions in plain English or Hindi: *"What medicines are running low in Counter 1?"*
- 📊 **Real-Time Clean Analytics** - Live stock count, critical shortages, cold-chain fridge monitor, and store-by-store breakdowns.
- 🔐 **Multi-Tenancy & Tenant Data Isolation** - Full organization scoping with clean RBAC (Admin, Vendor, Super Admin).



---

## 🚀 Quick Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or Neon account)
- Redis (or Upstash account)

### Backend Setup

```bash
# Clone repository
git clone https://github.com/Sayandip05/InvIQ.git
cd InvIQ

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database, Redis, and API keys

# Initialize database
cd backend
python -c "from app.infrastructure.database.connection import init_db; init_db()"

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend API URL

# Run development server
npm run dev
```

### Docker Setup (Recommended)

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start all services
docker-compose up -d

# Access application
# Frontend:      http://localhost:5173
# Backend:       http://localhost:8000
# API Docs:      http://localhost:8000/docs
# GraphQL:       http://localhost:8000/graphql/analytics
```

---

## 🏗️ Future-Proof System Architecture

### 1. Full-Stack & Cloud Infrastructure Architecture

```mermaid
graph TB
    subgraph ClientLayer["🖥️ Chemist & Counter Client Layer (React 19 SPA)"]
        Landing["🌐 Landing Page (Single & Multi-Shop Tiers)"]
        AuthApp["🔐 Auth & Tenant Portal (Argon2id + JWT)"]
        AdminPort["🛡️ Chemist Admin Dashboard & Unified Navbars"]
        BarcodeGun["🔫 Counter Barcode Scanner (USB / Bluetooth)"]
        VendorPort["🚚 Wholesaler / Distributor Delivery Portal"]
    end

    subgraph APIGateway["🚪 API Gateway & Middleware Layer (FastAPI)"]
        CORS["CORS & Trusted Hosts Security"]
        Limiter["SlowAPI Distributed Rate Limiter (Upstash Redis)"]
        AuthMid["JWT & Role Authorization Guard"]
        REST["REST API Engine (58+ Scoped Endpoints)"]
        ScanAPI["⚡ Quick-Dispense Engine (/api/inventory/scan-dispense)"]
        GQL["GraphQL Subgraph (/graphql/analytics)"]
        WS["WebSocket Alerts Engine (/ws/alerts)"]
    end

    subgraph BusinessLayer["⚙️ Domain & Application Services"]
        InvSvc["InventoryService & Barcode Dispenser<br/>• Atomic Stock Deduction<br/>• Sub-15ms Index Lookup"]
        AnalyticsSvc["AnalyticsService & FEFO Shield<br/>• 30/60/90 Day Expiry Calculations<br/>• Stockout Prevention"]
        ReqSvc["RequisitionService<br/>• Chemist Purchase Orders<br/>• Atomic Stock State Machine"]
        VendorSvc["VendorService<br/>• Excel Delivery Manifest Sync<br/>• Automatic PDF Invoices"]
        ImportSvc["DataImportService<br/>• Groq LLM Column Mapping<br/>• High-Confidence Auto Ingest"]
        PdfSvc["InvoicePdfService & ReportService<br/>• ReportLab Vector PDF Engine"]
        NotifySvc["NotificationService<br/>• SMTP Background Mailer<br/>• Expiry & Shortage Alerts"]
        CacheSvc["CacheService<br/>• Redis Tagged Invalidation"]
        AgentSvc["AgentService & ReAct Chatbot<br/>• LangGraph AI Architecture<br/>• Sarvam Multilingual Voice STT"]
    end

    subgraph DataStorage["💾 Persistence & Cloud Infrastructure"]
        PG[("🐘 PostgreSQL / Neon / Supabase<br/>Composite B-Tree Indexes<br/>Alembic Migrations")]
        Redis[("⚡ Upstash Redis<br/>Distributed Token Blacklist<br/>Analytics Cache")]
        Qdrant[("🧠 Qdrant Cloud Vector DB<br/>Gemini 768-dim Embeddings<br/>Conversation Memory")]
        Azure[("☁️ Azure Blob Storage<br/>Invoices, Reports & Manifests")]
        Groq["⚡ Groq Cloud (LLaMA 3.3 70B)"]
        Sarvam["🎙️ Sarvam AI (Saaras v3 STT)"]
    end

    %% Client Connections
    Landing --> CORS
    AuthApp --> CORS
    AdminPort --> CORS
    BarcodeGun --> ScanAPI
    VendorPort --> CORS
    CORS --> Limiter --> AuthMid
    AuthMid --> REST
    AuthMid --> ScanAPI
    AuthMid --> GQL
    AuthMid --> WS

    %% Gateway to Business Services
    ScanAPI --> InvSvc
    REST --> InvSvc
    REST --> AnalyticsSvc
    REST --> ReqSvc
    REST --> VendorSvc
    REST --> ImportSvc
    REST --> AgentSvc
    GQL --> AnalyticsSvc
    WS --> InvSvc

    %% Services to Data Storage
    InvSvc --> PG
    InvSvc --> CacheSvc
    ReqSvc --> PG
    VendorSvc --> PG
    VendorSvc --> PdfSvc
    VendorSvc --> Azure
    AnalyticsSvc --> PG
    AnalyticsSvc --> CacheSvc
    CacheSvc --> Redis
    ImportSvc --> Groq
    ImportSvc --> PG
    AgentSvc --> Groq
    AgentSvc --> Qdrant
    AgentSvc --> Sarvam
    NotifySvc --> PG
```

---

### 2. Retail Chemist & Distributor Supply Chain Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 👤 Customer
    actor Chemist as 💊 Chemist Counter
    participant App as 💻 InvIQ Counter App
    participant API as ⚡ FastAPI Backend
    participant DB as 🐘 PostgreSQL DB
    participant WS as 📡 WebSocket Service
    actor Supplier as 🚚 Medicine Wholesaler

    Note over Chemist,DB: 1. Counter Dispensing & Atomic Deduction
    Customer->>Chemist: Requests Medicine (e.g. Pan-D)
    Chemist->>App: Scans Barcode (8901086001234)
    App->>API: POST /api/inventory/scan-dispense
    API->>DB: Atomic Update: issued += 1 (Check Expiry / FEFO)
    DB-->>API: Stock Count Updated (e.g. 42 remaining)
    API-->>App: 200 OK (Beep Success Sound + Remaining Stock)
    
    opt Stock Below Minimum Threshold (< 15)
        API->>WS: Broadcast LOW_STOCK_ALERT
        WS-->>Chemist: Real-Time Audio & Visual Alert Triggered
    end

    Note over Chemist,Supplier: 2. Purchase Order & Wholesaler Delivery
    Chemist->>App: Creates Stock Requisition for Low Items
    App->>API: POST /api/requisition/create
    API->>Supplier: Email / In-App Notification Sent
    Supplier->>App: Logs into /vendor portal & uploads Excel Delivery Manifest
    App->>API: POST /api/vendor/upload-delivery
    API->>DB: Atomic Bulk Insert: received += Qty
    API->>DB: Auto-Generate Formal PDF Invoice
    API-->>Supplier: Delivery Manifest Successfully Processed
    API-->>Chemist: Live Counter Stock Instantly Replenished
```

---

### 3. High-Speed Barcode Quick-Dispense Engine

```mermaid
flowchart TD
    Scan["🔫 Barcode Gun Keystroke / Mobile Camera Scan"] --> Input["📱 InvIQ Counter Listener (Sub-50ms Capture)"]
    Input --> Request["🚀 POST /api/inventory/scan-dispense<br/>{ barcode_or_id: '8901086...', location_id: 1, qty: 1 }"]
    
    Request --> Auth["🛡️ Scoped Tenant Authorization"]
    Auth --> Lookup["🔍 O(1) Index Lookup on Item.barcode"]
    
    Lookup --> Check{"Is Item Valid & In Stock?"}
    Check -- No --> Error["❌ Error 400: Out of Stock / Unrecognized Barcode"]
    
    Check -- Yes --> Atomic["⚡ Atomic Transaction: inventory_transactions.issued += qty"]
    Atomic --> FEFO["🛡️ FEFO Validation: Check Batch Expiry Date"]
    
    FEFO --> Cache["🧹 Invalidate Redis Analytics Cache (analytics:*)"]
    Cache --> Threshold{"Stock < min_stock?"}
    
    Threshold -- Yes --> Alert["🚨 Dispatch WebSocket Alert & Push Notification"]
    Threshold -- No --> Resp["✅ Return JSON { remaining_stock, status: 'HEALTHY' }"]
    Alert --> Resp
    
    Resp --> Audio["🔊 Trigger Instant Counter Audio Beep & Flash Badge (<15ms)"]
```

---

## 👥 Role-Based Access Control (RBAC) & User Journeys

```mermaid
graph LR
    subgraph Roles["👤 User Roles & Hierarchies"]
        SuperAdmin["👑 Super Admin (Platform Owner)"]
        Admin["🛡️ Chemist Store Owner (Org Admin)"]
        Staff["💊 Counter Pharmacist / Staff"]
        Vendor["🚚 Medicine Wholesaler / Distributor"]
        Guest["👀 Guest / Demo Previewer"]
    end

    subgraph Capabilities["⚡ Scoped Capabilities"]
        PlatformOps["🏢 Multi-Tenant Provisioning<br/>Global Audit & System Logs"]
        StoreMgmt["💊 Multi-Branch Stock Tracking<br/>Barcode Quick Dispenser<br/>FEFO Expiry Loss Alerts<br/>Distributor Purchase Orders"]
        StaffOps["⚡ 1-Click Barcode Dispense<br/>Counter Stock Intake<br/>View Branch Stock"]
        VendorOps["📄 Excel Delivery Manifest Upload<br/>Auto Invoice Generation<br/>Download PDF Delivery Receipts"]
        DemoMode["🔍 Interactive Read-Only Preview<br/>Auto Sign-in Prompts for Actions"]
    end

    SuperAdmin --> PlatformOps
    SuperAdmin --> StoreMgmt
    Admin --> StoreMgmt
    Staff --> StaffOps
    Vendor --> VendorOps
    Guest --> DemoMode
```



---


---

## 🔷 GraphQL Analytics API

InvIQ uses a **REST + GraphQL hybrid** — the industry-standard pattern. REST handles all mutations (create/update/delete). GraphQL handles analytics reads with zero over-fetching.

**Endpoint:** `POST /graphql/analytics`  
**Playground (dev):** `GET /graphql/analytics`

### Available Queries

```graphql
# Dashboard chart data
{ dashboardStats {
    categoryDistribution { name value }
    lowStockItems { name stock minStock shortage }
    statusDistribution { name value color }
} }

# Full heatmap grid
{ heatmap { locations items matrix
    details { itemName currentStock healthStatus }
} }

# Stock alerts with filter
{ alerts(severity: "CRITICAL") {
    count alerts { itemName currentStock recommendedReorder }
} }

# Aggregate summary
{ summary {
    healthSummary { critical warning healthy }
    categories { name total critical }
} }

# Flexible ad-hoc query with server-side filters
{ stockHealth(location: "Warehouse", statusFilter: "CRITICAL") {
    itemName currentStock avgDailyUsage daysRemaining
} }
```

### Role-Aware Field Masking

| Caller | `avgDailyUsage` | `daysRemaining` | `leadTimeDays` |
|--------|:---:|:---:|:---:|
| Guest / Vendor | `null` | `null` | `null` |
| Manager / Admin / Super Admin | ✅ | ✅ | ✅ |

---

## 📚 Documentation

For detailed documentation, see the `/docs` folder:

- **[High-Level Design (HLD)](docs/HLD.md)** - System overview, architecture, tech stack decisions
- **[API Reference](docs/api.md)** - REST + GraphQL endpoint reference

---

## 🧪 Testing

```bash
# Run all tests (347 unit, integration, and security tests — 100% pass rate)
cd backend
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_inventory_service.py -v
```


---

## 📦 Project Structure

```
InvIQ/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/           # REST routes (analytics, auth, inventory…)
│   │   │   └── graphql/          # Strawberry GraphQL (types, context, resolvers, schema)
│   │   ├── application/          # Business logic services
│   │   ├── core/                 # Config, security, middleware
│   │   ├── domain/               # Business domain logic
│   │   └── infrastructure/       # Database, cache, vector store
│   └── tests/                    # Test suite
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Portal pages
│   │   ├── context/              # Auth & WebSocket context
│   │   └── utils/                # Helper functions
│   └── package.json
├── database/
│   ├── schema.sql                # Database schema
│   └── seed_data.py              # Sample data
├── docs/                         # Documentation
├── docker-compose.yml
└── README.md
```

---

## 🔐 Security Features

- **JWT Authentication** - Access (30min) + Refresh (7 days) tokens
- **Argon2 Password Hashing** - GPU-resistant algorithm
- **Rate Limiting** - 5-60 req/min based on endpoint sensitivity
- **Token Blacklist** - Logout invalidation with Redis
- **Login Lockout** - 5 attempts → 15 min lockout
- **Role-Based Access Control** - 5-tier role hierarchy with GraphQL field masking
- **Audit Logging** - All write operations tracked
- **Multi-Tenancy** - Organization-level data isolation

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Sayandip Bar**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?logo=linkedin&logoColor=white)](http://www.linkedin.com/in/sayandipbar2005)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?logo=github&logoColor=white)](https://github.com/Sayandip05)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?logo=gmail&logoColor=white)](mailto:sayandip@inviq.io)

---

## 🙏 Acknowledgments

- **FastAPI** - Modern Python web framework
- **Strawberry GraphQL** - Code-first GraphQL for Python
- **LangChain/LangGraph** - AI agent orchestration
- **Groq** - Fast LLM inference
- **Neon** - Managed PostgreSQL
- **Upstash** - Serverless Redis
- **ChromaDB** - Vector database for RAG

---

## 📊 Project Stats

![GitHub Stars](https://img.shields.io/github/stars/Sayandip05/InvIQ?style=social)
![GitHub Forks](https://img.shields.io/github/forks/Sayandip05/InvIQ?style=social)
![GitHub Issues](https://img.shields.io/github/issues/Sayandip05/InvIQ)
![GitHub License](https://img.shields.io/github/license/Sayandip05/InvIQ)

---

<div align="center">
  <p>Made with ❤️ for healthcare professionals</p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
