# DECISIONS.md

Architectural and technical decisions for the InvIQ backend.
Each entry records *why* a choice was made — the code itself shows *what* was chosen.

---

## FastAPI as the web framework

- **What**: FastAPI over Flask or Django REST Framework
- **Why**: FastAPI gives automatic OpenAPI docs (`/docs`) from type hints alone, which is critical for an API-first product with multiple frontend consumers. Pydantic request/response validation is built-in at zero extra cost. Dependency injection (`Depends()`) composing authentication, DB sessions, and repo factories is idiomatic and testable without mocking the entire request cycle.
- **Alternatives considered**: Flask — no built-in validation or docs. Django DRF — heavier serializer layer, less composable DI, opinionated ORM coupling.
- **Tradeoff accepted**: FastAPI's lifespan context manager is async but the ORM (SQLAlchemy) is sync. Routes using `Depends(get_db)` run DB I/O synchronously inside async handler coroutines, effectively blocking the event loop on DB calls. Acceptable for current load; revisit if latency under concurrency becomes a problem (would require switching to `asyncpg` + SQLAlchemy async).

---

## Layered architecture (API → Application → Domain → Infrastructure)

- **What**: Explicit four-layer structure with `api/`, `application/`, `domain/`, `infrastructure/` packages
- **Why**: Separates HTTP concerns from business logic from data access. Application services (`inventory_service.py`, `analytics_service.py`) depend on domain interfaces (`interfaces.py`), not on SQLAlchemy directly. Service-level unit tests can inject mock repositories without a real database.
- **Alternatives considered**: Flat route-based structure (routes directly call DB) — fast to write initially but creates tight coupling once the project grows past 5 routes. Hexagonal/ports-and-adapters — more principled but over-engineered for a two-person team at this stage.
- **Tradeoff accepted**: More files and indirection. New features require touching at least 3 layers (model → repo → service → route). Worth it once the project has multi-role access rules and multiple consumers of the same business logic.

---

## Domain interfaces as `typing.Protocol` (not `abc.ABC`)

- **What**: Repository contracts defined as structural Protocols (`IInventoryRepository`, `IUserRepository`, etc.)
- **Why**: Concrete repositories do not need to inherit from the interface explicitly. Python's type checker validates conformance structurally (duck typing). Existing repos required zero changes when interfaces were introduced, and there is no runtime overhead.
- **Alternatives considered**: `abc.ABC` with `@abstractmethod` — forces all concrete repos to explicitly inherit from the ABC, intrusive and creates tight coupling between infrastructure and domain layers.
- **Tradeoff accepted**: IDEs and mypy may not catch a missing method until type-checking is run explicitly. Mitigated by `@runtime_checkable` which enables `isinstance()` checks in tests.

---

## Argon2 password hashing (via `pwdlib`)

- **What**: Argon2 (winner of Password Hashing Competition 2015) instead of bcrypt
- **Why**: Argon2id is memory-hard, making GPU/ASIC cracking attacks disproportionately expensive. bcrypt is time-hard only — GPUs can parallelise bcrypt cracking cheaply. `pwdlib[argon2]` is the library recommended in the FastAPI 0.109+ security tutorial as a modern replacement for `passlib`.
- **Alternatives considered**: bcrypt (`passlib`) — the old FastAPI tutorial default. Still secure, but less resistant to modern hardware attacks. PBKDF2 — not memory-hard.
- **Tradeoff accepted**: Slightly more memory consumed per hash operation vs bcrypt. Negligible at login rates.

---

## Timing-attack prevention with `DUMMY_HASH`

- **What**: Always running `verify_password()` even when a username does not exist in the DB
- **Why**: Without this, an attacker can enumerate valid usernames by measuring response time — a "user not found" path skips the hash comparison and returns faster than "user found, wrong password". The `DUMMY_HASH` constant computed at startup makes both paths take the same time.
- **Alternatives considered**: Uniform sleep (e.g. `time.sleep(0.1)`) — fragile, adds latency to all failed logins, still measurable with high-precision timing.
- **Tradeoff accepted**: None meaningful. Costs one hash verify on every failed login for a non-existent user.

---

## JWT access + refresh token pair (no server-side sessions)

- **What**: Stateless JWT access tokens (30-min TTL) paired with longer-lived refresh tokens (7-day TTL), with a Redis token blacklist for logout
- **Why**: Stateless tokens allow the API to scale horizontally without sharing session state between workers. The `type` claim (`"type": "access"` / `"type": "refresh"`) prevents refresh tokens from being used to access protected endpoints directly — a common JWT implementation mistake.
- **Alternatives considered**: Server-side sessions (DB-backed) — require a shared session store, add a DB round-trip to every request. Opaque tokens — simpler to revoke but require a DB lookup on every request to validate.
- **Tradeoff accepted**: Access tokens cannot be instantly revoked (until they expire) without the blacklist. The Redis blacklist solves this for logout but adds a Redis round-trip to token validation. If Redis is down, the blacklist check is skipped gracefully (tokens remain valid until natural expiry).

---

## Upstash Redis via REST HTTP (not TCP connection)

- **What**: `upstash-redis` SDK (HTTPS REST calls) instead of `redis-py` with a persistent TCP connection
- **Why**: Upstash's free/hobby tier exposes a REST API endpoint. Serverless and edge environments (Vercel, Railway, Render) do not guarantee persistent TCP connections between requests. The REST interface works everywhere without connection pool concerns.
- **Alternatives considered**: `redis-py` with a standard Redis URL — requires a real Redis server or a paid Redis Cloud plan. Works fine in a long-running server process but fails in serverless cold-start scenarios.
- **Tradeoff accepted**: Each Redis operation is an HTTP round-trip (~10–50ms) instead of a TCP socket write (~1–2ms). Acceptable for cache TTL use cases (dashboard stats, token blacklist) where we are trading DB latency for Redis latency.

---

## Graceful Redis fallback (app continues without cache)

- **What**: Every Redis call is wrapped in try/except; `get_redis()` returns `None` when unavailable; callers check and proceed without caching
- **Why**: The app must remain functional if Redis goes down. Dashboard stats, token validation, and rate limiting all degrade gracefully — they bypass the cache and hit the DB, or skip blacklist checks.
- **Alternatives considered**: Fail-fast — crash the app if Redis is unavailable at startup. Too aggressive for a feature that should be a performance enhancement, not a hard dependency.
- **Tradeoff accepted**: A Redis outage makes token blacklisting unreliable (recently-logged-out tokens remain valid until expiry). The short access token TTL (30 min) limits the damage window.

---

## Rate limiting with `slowapi` + moving-window strategy

- **What**: `slowapi` (a Starlette/FastAPI port of `flask-limiter`) with `strategy="moving-window"` and Redis backend
- **Why**: Moving-window is more accurate than fixed-window — with fixed windows, a burst of requests right before a window reset doubles the effective rate. The Redis backend shares limits across multiple worker processes/containers; in-memory limits would be per-worker.
- **Alternatives considered**: Manual rate limiting in middleware — reinventing the wheel. `fastapi-limiter` — similar but less mature. Fixed-window in-memory — does not survive process restarts or multi-process deployments.
- **Tradeoff accepted**: Requires Redis to be functional for distributed rate limiting. Falls back to in-memory (per-worker) when Redis is unavailable, which means rate limits are less effective across multiple workers in that degraded state.

---

## Groq + LLaMA 3.3 70B as the LLM backend

- **What**: Groq's inference API running `llama-3.3-70b-versatile` instead of OpenAI GPT-4 or Anthropic Claude
- **Why**: Groq's hardware (LPU — Language Processing Unit) provides significantly faster inference than GPU-backed APIs, which matters for a real-time chat experience in an inventory dashboard. LLaMA 3.3 70B is open-source and cost-competitive. Groq's free tier allowed early development without per-token costs.
- **Alternatives considered**: OpenAI GPT-4 — higher quality but 10–30× more expensive per token and significantly higher latency on complex queries. Anthropic Claude — similar cost profile. Local Ollama — free but requires dedicated GPU hardware.
- **Tradeoff accepted**: Groq API key expiry is a real operational risk (observed in production — see 401 reset logic in `agent_service.py`). LLaMA 3.3 70B may lag on very domain-specific pharmaceutical reasoning vs GPT-4.

---

## LangGraph ReAct agent pattern for the AI chatbot

- **What**: LangGraph's `create_react_agent` with 9 inventory `@tool` functions, instead of plain LLM prompting or a custom tool-calling loop
- **Why**: ReAct (Reasoning + Acting) allows the LLM to decide which inventory tool to call based on the user's question, observe the result, and reason about whether to call another tool or answer directly. This is more flexible than hardcoding which tool to call based on keyword matching. LangGraph handles the tool-call loop, message accumulation, and state management.
- **Alternatives considered**: Plain LLM call with inventory context in the system prompt — requires stuffing all inventory data into context, hitting token limits. Custom function-calling loop — would replicate what LangGraph already does. LangChain AgentExecutor (older) — LangGraph's prebuilt ReAct agent is the successor and is simpler.
- **Tradeoff accepted**: LangGraph adds startup latency (import time) and a dependency on the LangChain ecosystem. The agent is lazily initialized (singleton built on first use) to avoid paying that cost at server startup.

---

## `ReadOnlySession` proxy for AI agent tool functions

- **What**: A structural proxy class that wraps `sqlalchemy.Session` and raises `RuntimeError` on any mutating method call (`.add()`, `.delete()`, `.commit()`, `.flush()`, etc.)
- **Why**: The AI agent translates user natural language into tool calls. Those tool functions must never accidentally modify inventory data — a hallucinating LLM could otherwise corrupt records. The proxy enforces this rule structurally at the Python layer, before any SQL reaches the database.
- **Alternatives considered**: Code review discipline — insufficient; one missed guard in a future tool function would create a vulnerability. Database-level read-only user — works but requires a separate DB connection config for agent tools and does not provide clear Python-level error messages.
- **Tradeoff accepted**: The proxy only covers SQLAlchemy ORM methods explicitly listed in `_WRITE_METHODS`. All tool functions are written by the team (not external contributors), so this coverage is considered sufficient for now.

---

## `contextvars.copy_context()` for the agent thread pool

- **What**: Capturing the current `contextvars.Context` snapshot before submitting the agent invocation to a `ThreadPoolExecutor`, and running the agent inside that context snapshot via `ctx.run()`
- **Why**: The DB session is stored in a `ContextVar` that is set in the chat route handler. Worker threads created by `ThreadPoolExecutor` do NOT automatically inherit `ContextVar` state in Python < 3.12 — they see the default (empty) value. Without `copy_context()`, every `@tool` function call would get `None` from `_get_db()` and fail immediately.
- **Alternatives considered**: Passing the DB session as a parameter to the agent invocation — LangGraph's `create_react_agent` does not expose a clean way to inject per-request state into tool functions. Thread-local storage — does not work cleanly across the event loop / thread boundary.
- **Tradeoff accepted**: `copy_context()` captures the entire context snapshot, which could theoretically include sensitive state from other middlewares. Acceptable because we control all ContextVar values in the codebase.

---

## 30-second agent timeout via `ThreadPoolExecutor` (not `signal.SIGALRM`)

- **What**: `future.result(timeout=30)` in a `ThreadPoolExecutor` instead of Unix signals to cancel a slow LLM call
- **Why**: `signal.SIGALRM` is only available on Unix and raises a signal in the main thread — it does not work inside a thread pool, and it is not cross-platform (breaks on Windows). The future-based timeout is portable and works correctly from an async FastAPI route.
- **Alternatives considered**: `asyncio.wait_for()` — the LangGraph agent is synchronous, not async-native, so wrapping it with `asyncio` requires `loop.run_in_executor()` anyway. `threading.Timer` — can cancel the timer object but cannot forcibly stop the running thread.
- **Tradeoff accepted**: When the timeout fires, the `ThreadPoolExecutor` thread continues running in the background until the Groq HTTP call completes or times out at the network level. This means leaked threads during slow LLM calls. Mitigated by Groq's own server-side timeout, which is typically under 30s.

---

## GraphQL only for analytics reads; REST for all mutations

- **What**: Strawberry GraphQL mounted at `/graphql/analytics` with a query-only schema; all write operations use REST endpoints
- **Why**: Analytics queries benefit from GraphQL's flexible field selection — frontends can ask for exactly the heatmap or alerts fields they need without multiple REST round-trips. Mutations in GraphQL add complexity (input types, mutation resolvers, error handling conventions) without meaningful benefit over REST for this domain. REST mutations are also easier to apply rate limits and audit logging to.
- **Alternatives considered**: Full GraphQL API — too much schema overhead for a small team. REST-only — would require multiple round-trips for complex analytics dashboards or over-fetching.
- **Tradeoff accepted**: Two API paradigms in one codebase. Developers need to understand both. GraphiQL playground is disabled in production to prevent exposing the interactive query editor.

---

## Multi-tenancy via `org_id` column (shared schema)

- **What**: Every entity (`User`, `Location`, `Item`, `InventoryTransaction`, `Requisition`, etc.) carries an `org_id` foreign key column; all queries filter by `org_id`
- **Why**: Simplest implementation for a small SaaS with trusted operators. No schema migrations per tenant, no cross-tenant connection pool routing. A single Supabase PostgreSQL instance serves all tenants.
- **Alternatives considered**: Separate database per tenant — complete isolation but operational overhead explodes with tenant count. Separate schema per tenant (PostgreSQL schemas) — good isolation but requires schema-level connection routing in the ORM.
- **Tradeoff accepted**: A missing `org_id` filter in any query is a data leak. The current codebase has `org_id=nullable` on some models (added incrementally), which means early data does not have full tenant isolation. Revisit before any security-critical multi-tenant launch.

---

## Batch-level data (batch number, expiry) on `InventoryTransaction`, not `Item`

- **What**: `batch_number` and `expiry_date` columns on `InventoryTransaction`; `storage_temp` (ambient/cold_chain) on `Item`
- **Why**: A product like Insulin is always cold-chain — that is a product-level attribute. But each incoming *delivery* of Insulin has its own batch number and expiry date. Putting batch/expiry on the Item would only allow one batch per product at a time, making multi-batch FIFO tracking impossible.
- **Alternatives considered**: Separate `Batch` table — the right long-term model, but adds another join for every stock query. Since transactions already represent inbound deliveries, attaching batch metadata there is a pragmatic single-table denormalization.
- **Tradeoff accepted**: Outbound transactions (issues) do not record which batch was consumed. Proper FIFO batch depletion would require a dedicated batch depletion model. Acceptable for Phase 1; revisit when regulatory batch traceability is required.

---

## Admin user seeded at server startup (not a migration)

- **What**: `seed_admin_user()` runs in the FastAPI lifespan on every startup; it is idempotent (checks for existing admin first)
- **Why**: Avoids a separate seed script or migration step during deployment. The first admin is created automatically from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), which is important for PaaS deployments where you cannot run one-off scripts easily.
- **Alternatives considered**: Alembic seed migration — would run once but requires coordinating migration runs with deployments. CLI seed command — requires the operator to remember to run it; error-prone.
- **Tradeoff accepted**: The seed runs on every cold start, which adds one DB query per startup. Mitigated by the early-return `if existing_admin` check.

---

## LangSmith tracing configured in lifespan, not at import time

- **What**: `configure_langsmith()` is called from the FastAPI `lifespan()` function, not when `config.py` is first imported
- **Why**: `configure_langsmith()` mutates `os.environ`, which is a process-level side effect. If it ran at import time, any test module that imports anything from `app.core.config` would silently activate LangSmith tracing — polluting the observability project with test data, and requiring every test to set `LANGCHAIN_API_KEY=''` to suppress it.
- **Alternatives considered**: Running it in `Settings.__init__` — same side-effect problem. Running it lazily on the first agent call — too late; LangChain reads env vars at its own import time.
- **Tradeoff accepted**: Developers must remember to call `configure_langsmith()` when writing alternative entry points (e.g. CLI scripts that use the agent). Currently only `main.py` does this correctly.

---

## Pydantic Settings v2 with multi-path `.env` discovery

- **What**: `BaseSettings` with a custom `_find_env_file()` function that searches `./`, `backend/../`, and `backend/` for a `.env` file
- **Why**: The repo can be run with `cwd` set to the workspace root, the `backend/` subdirectory, or from a container where the `.env` is mounted at `/`. Without multi-path discovery, developers would need to `cd` to a specific directory or set `ENV_FILE` manually.
- **Alternatives considered**: Requiring a fixed `ENV_FILE` environment variable — forces ops to remember an extra variable. `python-dotenv` manually loaded before `Settings` — adds complexity and potential double-load.
- **Tradeoff accepted**: The search order is implicit; if multiple `.env` files exist in different directories, only the first match is used. The search order is documented in the module docstring.

---

## SMTP email as opt-in feature (`SMTP_ENABLED=False` by default)

- **What**: All email sending is gated behind `settings.SMTP_ENABLED`; the app starts and runs fully without SMTP configured
- **Why**: SMTP credentials are a common gap in development environments and early deployments. Making email optional prevents onboarding friction and avoids hard failures in CI/CD pipelines where there is no mail server.
- **Alternatives considered**: Fail-fast if SMTP not configured — blocks deployments unnecessarily. Background email queue (Celery/Dramatiq) — adds a worker process dependency for a low-frequency operation.
- **Tradeoff accepted**: Welcome emails and password reset emails silently fail when SMTP is disabled. Operators must set `SMTP_ENABLED=true` and configure credentials to enable them. The log makes this visible at the `INFO` level.

---

## WebSocket authentication via JWT in query parameter

- **What**: `/ws/alerts?token=<jwt>` — JWT passed as query parameter, not in an `Authorization` header
- **Why**: The WebSocket protocol does not support custom HTTP headers during the upgrade handshake in browser environments. The `Authorization: Bearer` pattern works for HTTP requests but browsers' native `WebSocket` constructor does not accept custom headers.
- **Alternatives considered**: Cookie-based auth — requires `SameSite` and CSRF configuration, which conflicts with the API-first (no cookie) design of the rest of the auth system. First-message authentication (send token as first message after connection is accepted) — allows unauthenticated TCP connections to be established, which is a broader attack surface.
- **Tradeoff accepted**: JWTs in query strings appear in server access logs and browser history. Mitigated by using the short-lived access token (30-min TTL) rather than the refresh token. The token is validated before `websocket.accept()`, so unauthenticated connections are rejected before the WebSocket handshake completes.

---

## AI-assisted column mapping with deterministic row-level ingestion

- **What**: Using Groq LLM once per unique file shape for column mapping and confidence scoring (cached by SHA-256 header hash in Redis/memory), with all row-level validation, transformation, and DB writes executed purely deterministically.
- **Why**: Healthcare spreadsheets come with hundreds of ad-hoc column names across hospitals, clinics, and warehouses (e.g. "Med Name", "Item Description", "Qty In", "Batch #"). Pure hardcoded rules break when vendors use unexpected synonyms. However, sending entire datasets to an LLM would be slow, expensive, and risk hallucinated inventory numbers. Isolating AI to header mapping only and caching the result gives maximum flexibility with zero hallucination risk during row ingestion.
- **Alternatives considered**: Rule-based regex only — breaks whenever vendors use unexpected synonyms or different languages. Full LLM row processing — dangerous, slow, expensive, and non-deterministic. Manual-only mapping UI — high friction for users on every upload.
- **Tradeoff accepted**: Confidence gating quarantines rows when header naming confidence is below configured threshold (0.90 for high-risk fields, 0.70 for standard fields). Users can inspect quarantined rows with exact failure reasons in the quarantine table.

---

## Google Gemini Embeddings (`gemini-embedding-001`) over local SentenceTransformers

- **What**: Switched vector memory embedding generator from local PyTorch `sentence-transformers` (`all-MiniLM-L6-v2`, 384-dim) to Google Gemini Embeddings API (`gemini-embedding-001`, 768-dim) via HTTP REST.
- **Why**: The local `sentence-transformers` package required PyTorch and large binary model weights (~1.5GB+ disk and heavy CPU/RAM overhead on server startup). Replacing it with Gemini API eliminates heavy local ML dependencies, drops build times, drastically reduces Docker container size, and provides higher semantic accuracy.
- **Alternatives considered**: Local `all-MiniLM-L6-v2` with ONNX runtime — still requires bundling model weights in the container. OpenAI `text-embedding-3-small` — adds another vendor dependency when Google ecosystem is already integrated.
- **Tradeoff accepted**: Embeddings now require an outbound HTTPS call to Google's Generative Language API (`GEMINI_API_KEY`), adding minor network latency (~50-100ms) during vector upsert and query search.

---

## Automated Vendor Delivery Invoice Generation with Azure Blob Storage

- **What**: Generating a structured `VendorInvoice` with financial calculations (18% GST), rendering a styled PDF via ReportLab, uploading to Azure Blob Storage, and persisting metadata and binary bytes in PostgreSQL upon vendor delivery Excel upload.
- **Why**: In healthcare inventory, vendor physical delivery manifests must produce verifiable receipts with itemized batches, quantities, unit prices, and tax computations immediately upon receiving stock. Using ReportLab in-memory rendering avoids filesystem disk persistence issues on ephemeral containers (Render/Docker), while Azure Blob Storage provides cloud-grade persistent file hosting and secure SAS download links.
- **Alternatives considered**: Client-side PDF rendering (jsPDF in frontend) — cannot generate official server-verified invoices during background batch ingestion or API-driven deliveries. Heavy headless Chromium (Puppeteer/Playwright) — adds 300MB+ container bloat and slow execution (~2-3s/PDF vs ReportLab's ~15ms). Local disk PDF storage — loses files on container redeployments.
- **Tradeoff accepted**: Invoices are generated synchronously upon Excel commit; for typical delivery batches (10–200 items), ReportLab PDF rendering completes in under 20ms, negligible compared to database commit time.

---

## PostgreSQL ENUM Types & DB-Level Data Integrity

- **What**: Migrated `users.role` and `organizations.plan` from plain unconstrained `VARCHAR(50)` strings to native PostgreSQL `ENUM` types (`user_role` and `org_plan`) with strict driver-level and database-level enforcement via Alembic migration `73a536e2e770`.
- **Why**: Plain strings allow invalid, corrupted, or typo-prone values (e.g. `role="hacker"` or `role=""`) to bypass application code if inserted via direct SQL, scripts, or migrations. Enforcing native database enums guarantees data integrity at the storage layer while enabling PostgreSQL to store enums compactly as 4-byte integers internally.
- **Alternatives considered**: Application-only Pydantic/Enum validation — vulnerable to direct DB updates or raw SQL queries. Check constraints (`CHECK (role IN (...))`) — functional, but harder to introspect than native Postgres ENUMs.
- **Tradeoff accepted**: Altering an existing ENUM type in PostgreSQL requires specific DDL (`ALTER TYPE ... ADD VALUE`), which requires Alembic migrations.

---

## Redis Pub/Sub for Real-Time WebSocket Alerts Across Multi-Worker Deployments

- **What**: Replaced in-process thread-queue WebSocket alert dispatching with Redis Pub/Sub (`inviq:ws:alerts`), connected via an asyncio subscriber background task initialized in FastAPI's `lifespan` context manager.
- **Why**: In production environments running multi-worker Uvicorn processes or horizontal container instances, an in-process Python queue (`threading.Lock` + `list`) fails silently: a transaction alert emitted on Worker A is never visible to the WebSocket client connected to Worker B. Redis Pub/Sub provides sub-millisecond, cross-process broadcast to all active WebSocket clients regardless of which worker holds their TCP connection.
- **Alternatives considered**: Database polling for alerts — adds heavy database read load and latency. Single-worker Uvicorn restriction — cannot utilize multi-core server hardware.
- **Tradeoff accepted**: Requires Redis to be configured for multi-worker production. Maintained an automatic in-process queue fallback for single-worker local development and unit test environments where Redis is not running.

---

## `get_db_context()` Context Manager for Celery Scheduled Workers

- **What**: Created `get_db_context()` context manager in `connection.py` providing transactional `with get_db_context() as db:` sessions with automatic commit on success and rollback on exception.
- **Why**: Celery background tasks (`celery_fefo_audit`, `celery_stock_audit`, `celery_cold_chain_check`) run outside the FastAPI HTTP request cycle and cannot use FastAPI's `Depends(get_db)` generator. A dedicated context manager guarantees that background workers clean up DB connections reliably and prevent connection pool leaks.
- **Alternatives considered**: Raw `SessionLocal()` manual open/close — prone to leaked connections if exceptions occur before `db.close()`.
- **Tradeoff accepted**: None; provides clean Pythonic context management everywhere outside HTTP request scopes.

---

## Dual-Layer Caching with Thread-Safe In-Memory Fallback & SCAN Invalidation

- **What**: Upgraded `CacheService` to maintain a thread-safe in-memory cache with timestamp-based TTL eviction alongside Upstash Redis, with `cache_invalidate_pattern()` performing non-blocking SCAN iteration and matching local keys via `fnmatch`.
- **Why**: In serverless and testing environments where Redis may be unreachable or offline, application caching previously failed or threw exceptions. The dual-layer design ensures that caching works seamlessly in offline mode, local dev, and testing while ensuring that writes invalidate both Redis and local in-memory keys consistently.
- **Alternatives considered**: Fail without caching when Redis is down — increases DB load on cache misses. Redis `KEYS` command — blocks Redis single-threaded event loop on large keyspaces.
- **Tradeoff accepted**: In-memory cache in multi-process environments is local to each process; Redis remains the primary shared cache in production.
