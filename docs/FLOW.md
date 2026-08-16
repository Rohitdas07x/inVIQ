# FLOW.md — InvIQ Backend Execution Flows

Traced from actual source code. Only cross-file/cross-folder movement is documented.
Last scanned: 2026-08-11.

---

## Request Lifecycle (all routes)

**Trigger**: Every incoming HTTP request

**Path**:
```
ASGI stack
  → RequestLoggerMiddleware.__call__         (core/middleware/request_logger.py)
  → CORSMiddleware                           (fastapi/starlette built-in)
  → slowapi limiter check                   (core/rate_limiter.py — via @limiter.limit decorator)
  → route handler                           (api/routes/*.py)
```

**Branches**:
- `scope["type"] == "websocket"` → `RequestLoggerMiddleware` passes through without wrapping; goes straight to WebSocket handler
- Rate limit exceeded → `rate_limit_handler` (core/rate_limiter.py) → HTTP 429 JSON, no further processing

---

## Authentication Dependency (shared by most routes)

**Trigger**: `Depends(get_current_user)` in any route parameter

**Path**:
```
core/dependencies.py:get_current_user
  → infrastructure/cache/token_blacklist.py:is_token_blacklisted
      → infrastructure/cache/redis_client.py:get_redis          [Redis path]
      OR → _memory_blacklist dict                               [fallback path]
  → core/security.py:verify_access_token
      → core/security.py:decode_token                          (PyJWT decode)
  → infrastructure/database/user_repo.py:get_by_id            (DB query)
```

**Branches**:
- Token on blacklist → HTTP 401, stops here
- JWT decode failure → `AuthenticationError` → HTTP 401
- User not found or inactive → HTTP 401
- Success → returns `User` ORM object to route handler

**Called from**: Every route using `Depends(get_current_user)` or `Depends(require_admin)` etc.

---

## Role Guards (shared dependency chain)

**Path** (e.g. `require_admin`):
```
core/dependencies.py:require_admin
  → core/dependencies.py:require_role("admin")
      → core/dependencies.py:get_current_user        [see above]
      → core/security.py:check_role_permission        (ROLE_HIERARCHY dict lookup)
```

- `require_vendor` → requires role ≥ vendor (1)
- `require_staff` → requires role ≥ staff (2)
- `require_admin` → requires role ≥ admin (3)
- `require_super_admin` → requires role = super_admin (4)


---

## POST /api/auth/register

**Trigger**: HTTP POST, requires admin JWT

**Path**:
```
api/routes/auth.py:register
  → [limiter: 3/minute]
  → Depends(require_admin) → [Auth Dependency above]
  → Depends(get_user_repo) → infrastructure/database/user_repo.py:UserRepository
  → UserRepository.create()                                    (DB INSERT users)
  → application/notification_service.py:NotificationService.send_welcome_email
      → [if SMTP_ENABLED] → smtplib.SMTP → external SMTP server
  → application/audit_service.py:AuditService.log
      → infrastructure/database/audit_repo.py:AuditRepository.create  (DB INSERT audit_logs)
```

**Branches**:
- Invalid role string → `ValidationError` → HTTP 422
- SMTP disabled (`settings.SMTP_ENABLED=False`) → email skipped, `email_sent=False` in audit log
- SMTP failure → logged, non-blocking; user still created

**Side effects**: DB write (users), DB write (audit_logs), optional SMTP email

---

## POST /api/auth/login

**Trigger**: HTTP POST (no auth required)

**Path**:
```
api/routes/auth.py:login
  → [limiter: 5/minute by IP]
  → Depends(get_user_repo) → UserRepository
  → UserRepository.get_by_username()                         (DB SELECT users)
  → [lockout check] UserRepository.reset_login_attempts() if lock expired
  → core/security.py:authenticate_user
      → core/security.py:verify_password                     (Argon2 hash compare)
      → [user=None path] core/security.py:verify_password(DUMMY_HASH)   (timing attack prevention)
  → [success] UserRepository.record_login()                  (DB UPDATE last_login_at, reset attempts)
  → core/security.py:create_access_token                     (PyJWT encode)
  → core/security.py:create_refresh_token                    (PyJWT encode)
  → application/audit_service.py:AuditService.log → audit_repo.create
```

**Branches**:
- Wrong password, user exists → `UserRepository.increment_login_attempts()` (DB UPDATE)
  - If attempts ≥ MAX → `UserRepository.lock_user()` (DB UPDATE locked_until) + audit ACCOUNT_LOCKED
- User not found → dummy hash runs, `AuthenticationError` → HTTP 401
- Account locked (lock still active) → `AuthenticationError` → HTTP 401
- Account inactive → `AuthenticationError` → HTTP 401

**Side effects**: DB write (users.last_login_at / login_attempts / locked_until), DB write (audit_logs)

---

## POST /api/auth/logout

**Trigger**: HTTP POST, requires valid JWT

**Path**:
```
api/routes/auth.py:logout
  → Depends(get_current_user) → [Auth Dependency]
  → infrastructure/cache/token_blacklist.py:blacklist_token
      → infrastructure/cache/redis_client.py:get_redis → r.setex(blacklist:<token>, TTL)
      OR → _memory_blacklist dict                        [fallback]
  → application/audit_service.py:AuditService.log → audit_repo.create
```

**Side effects**: Redis write (token blacklist), DB write (audit_logs)

---

## POST /api/auth/refresh

**Trigger**: HTTP POST (no auth required — uses refresh token in body)

**Path**:
```
api/routes/auth.py:refresh_token
  → [limiter: 10/minute]
  → infrastructure/cache/token_blacklist.py:is_token_blacklisted   (replay check)
  → core/security.py:verify_refresh_token                          (PyJWT decode, type check)
  → UserRepository.get_by_id()                                     (DB SELECT)
  → infrastructure/cache/token_blacklist.py:blacklist_refresh_token (old token revoked)
  → core/security.py:create_access_token                           (new access token)
  → core/security.py:create_refresh_token                          (new refresh token)
```

**Branches**:
- Old refresh token already blacklisted → `AuthenticationError` → HTTP 401 (replay attack prevention)
- Token type ≠ "refresh" → `AuthenticationError`

**Side effects**: Redis write (old refresh token blacklisted)

---

## POST /api/auth/google-auth

**Trigger**: HTTP POST, Google ID token in body

**Path**:
```
api/routes/auth.py:google_auth
  → [limiter: 10/minute]
  → httpx.get(settings.GOOGLE_OAUTH_VERIFY_URL)    EXTERNAL CALL: Google OAuth2 userinfo API
  → UserRepository.get_by_email()                  (DB SELECT)
  → [user exists] UserRepository.record_login()    (DB UPDATE)
  → [user not found] UserRepository.create()       (DB INSERT — auto-register)
  → core/security.py:create_access_token + create_refresh_token
  → AuditService.log → audit_repo.create
```

**Branches**:
- Google API non-200 → `AuthenticationError`
- No email in Google response → `AuthenticationError`
- Existing user inactive → `AuthenticationError`
- New user: `UserRepository.create()` with `is_verified=True`, `role="staff"` (default)

**Side effects**: External HTTP call (Google), DB write (users on first login), DB write (audit_logs)

---

## POST /api/auth/request-password-reset

**Trigger**: HTTP POST (no auth required)

**Path**:
```
api/routes/auth.py:request_password_reset
  → [limiter: 3/minute]
  → UserRepository.get_by_email()
  → [user exists] auth.py:_send_password_reset_email
      → auth.py:_generate_password_reset_token      (PyJWT encode, 1h TTL)
      → auth.py:_send_email → smtplib.SMTP          EXTERNAL CALL: SMTP
  → AuditService.log → audit_repo.create
```

**Branches**:
- User not found → same success response returned (email enumeration prevention)
- SMTP disabled → email not sent, silently logged

**Side effects**: Optional SMTP email, DB write (audit_logs)

---

## POST /api/auth/reset-password

**Trigger**: HTTP POST, signed reset token in body

**Path**:
```
api/routes/auth.py:reset_password
  → [limiter: 5/minute]
  → jwt.decode(token, settings.SECRET_KEY)    (inline, not via security.py)
  → UserRepository.get_by_id()
  → core/security.py:hash_password            (Argon2 hash)
  → UserRepository.update()                  (DB UPDATE password + clear lockout)
  → AuditService.log → audit_repo.create
```

**Side effects**: DB write (users.hashed_password, login_attempts=0, locked_until=None), DB write (audit_logs)

---

## POST /api/inventory/transaction

**Trigger**: HTTP POST, requires staff or above

**Path**:
```
api/routes/inventory.py:add_single_transaction
  → Depends(require_staff) → [Auth + Role guards]
  → Depends(get_inventory_repo) → InventoryRepository
  → Depends(get_inventory_service) → InventoryService(repo)
  → InventoryRepository.get_location_by_id()        (DB SELECT validation)
  → InventoryRepository.get_item_by_id()             (DB SELECT validation)
  → application/inventory_service.py:InventoryService.add_transaction
      → InventoryRepository.get_previous_transaction()   (DB SELECT last tx)
      → InventoryRepository.get_item_by_id()             (DB SELECT for min_stock)
      → InventoryRepository.create_transaction()         (DB INSERT inventory_transactions)
      → [if closing_stock <= item.min_stock]
          → api/routes/websocket.py:queue_websocket_alert   (appends to pending_alerts list)
          → application/inventory_service.py:_get_recipient_emails   (DB SELECT users, 60s cache)
          → InventoryRepository.get_location_by_id()
          → threading.Thread → NotificationService.send_low_stock_alert   BACKGROUND THREAD
              → [if SMTP_ENABLED] smtplib.SMTP    EXTERNAL CALL: SMTP (non-blocking)
  → application/cache_service.py:cache_invalidate_pattern("analytics:*")
      → infrastructure/cache/redis_client.py:get_redis → r.scan + r.delete
```

**Branches**:
- `closing_stock < 0` → `ValidationError` → HTTP 422, no DB write
- Location or item not found → `NotFoundError` → HTTP 404
- Stock alert: `closing_stock <= 0` → "CRITICAL"; `0 < closing_stock <= min_stock` → "WARNING"
- SMTP disabled or no recipients → email thread not started

**Side effects**: DB write (inventory_transactions), optional in-memory alert queue write, optional background SMTP email, Redis cache invalidation of all `analytics:*` keys

---

## POST /api/inventory/bulk-transaction

**Trigger**: HTTP POST, requires staff or above

**Path**:
```
api/routes/inventory.py:add_bulk_transactions
  → Depends(require_staff), Depends(get_inventory_repo), Depends(get_inventory_service)
  → InventoryRepository.get_location_by_id()        (DB SELECT validation)
  → application/inventory_service.py:InventoryService.bulk_add_transactions
      → [for each item] InventoryService.add_transaction(flush_only=True)
          → [same path as single transaction above, but flush_only skips commit]
      → InventoryRepository.db.commit()              (single commit for all rows)
  → cache_service.cache_invalidate_pattern("analytics:*")
```

**Side effects**: DB write (multiple inventory_transactions in one commit), optional alert queue + SMTP (per item), Redis cache invalidation

---

## GET /api/analytics/heatmap  |  /alerts  |  /summary  |  /dashboard/stats

**Trigger**: HTTP GET, requires authenticated user

**Path** (identical pattern for all four):
```
api/routes/analytics.py:get_heatmap / get_alerts / get_summary / get_dashboard_stats
  → [limiter: 30/minute]
  → Depends(get_current_user) → [Auth Dependency]
  → application/cache_service.py:cache_get(key)
      → infrastructure/cache/redis_client.py:get_redis → r.get
  → [cache HIT] return cached dict directly
  → [cache MISS]
      → application/analytics_service.py:AnalyticsService.get_heatmap/get_alerts/etc
          → infrastructure/database/queries.py:get_heatmap_data / get_critical_alerts / etc (DB SELECT)
          → domain/calculations.py:format_stock_item / calculate_reorder_quantity
      → cache_service.cache_set(key, result, ttl=ANALYTICS_TTL or DASHBOARD_TTL)
          → redis_client.py:get_redis → r.setex
```

**Branches**:
- `GET /alerts?severity=WARNING` → calls `AnalyticsService.get_alerts(db, "WARNING")`; cache key is `analytics:alerts:WARNING`
- `severity` not in ["CRITICAL", "WARNING"] → `ValidationError` → HTTP 422
- Redis unavailable → cache_get returns None, result is fetched from DB and cache_set is a no-op

**Side effects**: Redis write on cache miss (TTL 2–5 min depending on endpoint)

---

## POST /api/chat/query

**Trigger**: HTTP POST, requires authenticated user

**Path**:
```
api/routes/chat.py:chat_query
  → [limiter: 20/minute]
  → Depends(get_current_user) → [Auth Dependency]
  → [if conversation_id] chat.py:_verify_session_ownership   (DB SELECT chat_sessions)
  → chat.py:_build_agent_response
      → application/agent_tools.py:set_db_session             (ContextVar write — for thread inheritance)
      → [non-greeting] application/agent_tools.py:get_inventory_overview.invoke({})
          → agent_tools.py:_get_db() → ContextVar read → DB SELECT inventory_transactions + items + locations
      → [if DB empty] return early with onboarding message
      → chat.py:_get_vector_context
          → infrastructure/vector_store/vector_store.py:get_vector_memory   (singleton)
          → VectorMemory.search_relevant → Google Gemini Embeddings API (gemini-embedding-001) → qdrant_client.query_points   EXTERNAL CALL: Gemini API + Qdrant Cloud
      → [if conversation_id] chat.py:_get_conversation_history   (DB SELECT chat_messages)
      → application/agent_service.py:is_agent_available
          → [if _agent is None and GROQ_API_KEY set] agent_service.py:_build_agent
              → langchain_groq.ChatGroq(...)
              → langgraph.prebuilt.create_react_agent(llm, tools=INVENTORY_TOOLS)
      → [agent available] application/agent_service.py:invoke_agent
          → domain/agent/prompts.py:get_system_prompt
          → contextvars.copy_context()
          → ThreadPoolExecutor.submit(ctx.run, _agent.invoke, {messages})   THREAD POOL
              → LangGraph ReAct loop:
                  → Groq API call (llm.invoke)   EXTERNAL CALL: Groq
                  → [tool selected] application/agent_tools.py:<tool_name>.invoke()
                      → agent_tools.py:_get_db() → ContextVar → DB SELECT (via ReadOnlySession proxy)
                  → [repeat until final answer]
          → future.result(timeout=30)
      → [agent unavailable or RuntimeError] chat.py:_rule_based_response
          → application/agent_tools.py:<tool>.invoke({})   (keyword matching, direct tool calls)
  → [new conversation] DB INSERT chat_sessions
  → DB INSERT chat_messages (user + assistant)
  → DB COMMIT
  → VectorMemory.add_message × 2   EXTERNAL CALL: Gemini Embeddings API + Qdrant Cloud (async background, fire-and-forget via try/except)
```

**Branches**:
- `GROQ_API_KEY` not set → agent never built; falls to rule-based immediately
- `GEMINI_API_KEY` not set → vector search skipped, chat continues without RAG context
- Agent timeout after 30s → `RuntimeError` → falls to rule-based response
- Groq 401 (key expired) → agent singleton reset to None → RuntimeError → rule-based
- Qdrant unavailable → `_get_vector_context` returns `""` (no context), chat continues without memory
- `_is_greeting()` matches → skip empty-DB check, proceed to agent directly
- Message too short (< 3 chars) → `ValidationError` → HTTP 422

**Side effects**: DB writes (chat_sessions, chat_messages), Qdrant write (vector memory for future RAG), External HTTP call (Groq API), External HTTP call (Qdrant Cloud)

---

## GET /api/chat/history/{conversation_id}

**Path**:
```
api/routes/chat.py:get_chat_history
  → Depends(get_current_user)
  → DB SELECT chat_sessions (with messages eager-loaded via relationship)
  → chat.py:_verify_session_ownership     (ownership check)
```

**Branches**: Session not found → `NotFoundError`; session belongs to another user → `AuthorizationError`

---

## DELETE /api/chat/history/{conversation_id}

**Path**:
```
api/routes/chat.py:clear_chat_history
  → [limiter: 10/minute]
  → Depends(get_current_user)
  → DB SELECT chat_sessions
  → chat.py:_verify_session_ownership
  → db.delete(session) + db.commit()     cascade deletes all chat_messages
```

**Side effects**: DB delete (chat_sessions + all chat_messages via cascade)

---

## POST /api/chat/transcribe

**Trigger**: HTTP POST, multipart audio file upload

**Path**:
```
api/routes/chat.py:transcribe_audio
  → [limiter: 20/minute]
  → Depends(get_current_user)
  → [if no SARVAM_API_KEY] ValidationError
  → sarvamai.SarvamAI.speech_to_text.transcribe(file, model="saaras:v3")   EXTERNAL CALL: Sarvam AI
```

**Side effects**: External HTTP call (Sarvam AI STT API)

---

## POST /api/requisition/create

**Path**:
```
api/routes/requisition.py:create_requisition
  → [limiter: 20/minute]
  → Depends(require_staff)
  → Depends(get_requisition_service) → RequisitionService(repo, inv_repo)
  → application/requisition_service.py:RequisitionService.create_requisition
      → RequisitionRepository.get_location()     (DB SELECT locations)
      → [for each item] RequisitionRepository.get_item()  (DB SELECT items)
      → requisition_service.py:_generate_requisition_number   (DB COUNT requisitions)
      → RequisitionRepository.create()           (DB INSERT requisitions + requisition_items)
```

**Side effects**: DB writes (requisitions, requisition_items)

---

## PUT /api/requisition/{id}/approve

**Path**:
```
api/routes/requisition.py:approve_requisition
  → [limiter: 10/minute]
  → Depends(require_manager)
  → RequisitionService.approve_requisition
      → RequisitionRepository.get_by_id()        (DB SELECT)
      → [status ≠ PENDING] InvalidStateError
      → [for each item] RequisitionRepository.get_requisition_item()  (DB SELECT)
      → [for each approved item] InventoryService.add_transaction(issued=qty, received=0)
          → [same transaction path as POST /api/inventory/transaction]
      → RequisitionRepository.update_status(APPROVED)  (DB UPDATE)
```

**Branches**:
- Requisition not in PENDING state → `InvalidStateError` → HTTP 409
- Insufficient stock per item → `InsufficientStockError` (raised inside inventory_service); other items may still process

**Side effects**: DB writes (requisition status update, inventory_transactions per item), possible WebSocket alert + SMTP email per item

---

## GET /api/admin/overview

**Path**:
```
api/routes/admin.py:get_platform_overview
  → Depends(require_admin)
  → infrastructure/database/user_repo.py:UserRepository.count()          (DB SELECT COUNT)
  → UserRepository.count_filtered(is_active=True/False)                  (DB SELECT COUNT × 2)
  → [for each role] UserRepository.count_filtered(role=...)               (DB SELECT COUNT × 4)
  → UserRepository.get_all_filtered(limit=5)                              (DB SELECT)
  → infrastructure/database/audit_repo.py:AuditRepository.get_recent(10)  (DB SELECT)
```

---

## GET /api/admin/reports/generate

**Path**:
```
api/routes/admin.py:generate_pdf_report
  → Depends(require_admin)
  → application/report_service.py:ReportService.__init__(db)
  → [report_type=inventory]    ReportService.get_stock_rows()         (DB SELECT via queries.py)
  → [report_type=low_stock]    ReportService.get_low_stock_rows()     (DB SELECT)
  → [report_type=transactions] ReportService.get_transaction_rows()   (DB SELECT)
  → [report_type=requisitions] ReportService.get_requisition_stats()
                                + ReportService.get_requisition_rows() (DB SELECT × 2)
  → reportlab.SimpleDocTemplate.build(elements)   (PDF construction, in-memory)
  → StreamingResponse(BytesIO)                    (streamed PDF bytes to client)
```

**Side effects**: None (read-only, no DB writes)

---

## POST /api/vendor/upload-delivery

**Path**:
```
api/routes/vendor.py:upload_delivery
  → [limiter: 10/minute]
  → Depends(get_current_user)
  → vendor.py:_require_vendor_role        (inline role check: vendor/admin/super_admin)
  → vendor.py:_has_location_access        (JSON location_ids field check)
  → DB SELECT locations                   (validate location exists)
  → application/vendor_service.py:VendorService.__init__(db)
      → InventoryRepository(db)
      → InventoryService(inv_repo)
      → InvoiceRepository(db)
  → VendorService.parse_and_process_excel
      → openpyxl.load_workbook(BytesIO)   (in-process Excel parse)
      → DB SELECT items                   (build item_lookup dict)
      → DB SELECT latest_stocks           (pre-fetch closing stocks for location_id in 1 query)
      → [for each Excel row]
          → InventoryRepository.create_transaction(flush_only=True)
              → [calculates opening/closing stock in O(1) memory, 0 DB roundtrips in loop]
              → [accumulates line items: item_name, qty, unit, unit_price, total]
      → db.commit()                       (single atomic commit for all transactions)
      → DB INSERT vendor_uploads          (upload record)
      → db.commit()
      → [if success_count > 0] VendorService._generate_invoice_for_upload

          → InvoiceRepository.generate_next_invoice_number (INV-YYYYMMDD-XXX)
          → ReportLab PDF generation (InvoicePdfService.generate_invoice_pdf)
          → Azure Blob Storage upload (AzureBlobStorageService.upload_file → invoices/YYYY/MM/...)
          → DB INSERT vendor_invoices     (invoice record with line_items JSON + pdf_content bytes)
          → db.commit()
  → application/cache_service.py:cache_invalidate_pattern("analytics:*")
```

**Branches**:
- Not `.xlsx`/`.xls` → `ValidationError`
- File > 5MB → `ValidationError`
- Missing item_name or quantity columns → early return error dict
- Item name not found in DB → row recorded in errors_detail, not fatal
- Quantity ≤ 0 → row recorded in errors_detail
- `flush_only=True` means stock alert + WebSocket queueing still happen per row (inside `add_transaction`), but commit is deferred
- Azure Blob Storage not configured → PDF bytes stored directly in PostgreSQL `vendor_invoices.pdf_content` (stateless fallback)

**Side effects**: DB writes (`inventory_transactions` + `vendor_uploads` + `vendor_invoices`), Azure Blob Storage upload (`invoices/YYYY/MM/INV-*.pdf`), Redis cache invalidation of all `analytics:*` keys

---

## GET /api/vendor/invoices  |  GET /api/vendor/invoices/{id}/pdf

**Trigger**: HTTP GET, requires vendor, admin, or super_admin

**Path**:
```
api/routes/vendor.py:list_invoices / download_invoice_pdf
  → Depends(get_current_user) → _require_vendor_role
  → [list_invoices]
      → InvoiceRepository.list_invoices (DB SELECT vendor_invoices, filtered by vendor_user_id if vendor)
  → [download_invoice_pdf]
      → InvoiceRepository.get_by_id (DB SELECT vendor_invoices)
      → [if Azure configured] AzureBlobStorageService.download_file(pdf_path)
      → [fallback] Read invoice.pdf_content (DB LargeBinary bytes)
      → [fallback] InvoicePdfService.generate_invoice_pdf (on-the-fly render)
      → StreamingResponse(BytesIO(pdf_bytes), media_type="application/pdf")
```

**Side effects**: Streams PDF document to browser


---

## POST /api/superadmin/organizations

**Path**:
```
api/routes/superadmin.py:create_organization
  → [limiter: 10/minute]
  → Depends(require_super_admin)
  → DB SELECT organizations             (duplicate slug check)
  → DB INSERT organizations
  → AuditService.log → audit_repo.create
```

**Side effects**: DB write (organizations), DB write (audit_logs)

---

## POST /api/superadmin/organizations/{org_id}/admin

**Path**:
```
api/routes/superadmin.py:create_org_admin
  → Depends(require_super_admin)
  → DB SELECT organizations             (org existence check)
  → DB SELECT users                     (duplicate username/email check)
  → core/security.py:hash_password      (Argon2)
  → DB INSERT users                     (role="admin", is_verified=True)
  → AuditService.log → audit_repo.create
```

**Side effects**: DB write (users), DB write (audit_logs)

---

## WebSocket /ws/alerts

**Trigger**: WebSocket upgrade (persistent connection), JWT token in query param

**Path**:
```
api/routes/websocket.py:websocket_alerts
  → websocket.query_params.get("token")
  → [no token] websocket.close(4001) — connection never accepted
  → core/security.py:verify_access_token     (PyJWT decode)
  → [invalid token] websocket.close(4001)
  → ConnectionManager.connect(websocket)      (accept + add to active_connections list)
  → [ping received] websocket.send_json({"type": "pong"})
  → [WebSocketDisconnect] ConnectionManager.disconnect(websocket)
```

**Pub/Sub Broadcast Flow**:
```
inventory_service.py (or background_tasks.py)
  → queue_websocket_alert(alert)
      → Redis.publish("inviq:ws:alerts", json_payload)   [Primary multi-worker path]
          → start_redis_subscriber() (Async lifespan listener)
              → ConnectionManager.broadcast(alert)
                  → [for each connection] websocket.send_json(alert)
      OR → In-process pending_alerts list                [Local / dev fallback path]
```

**Branches**:
- Alerts are queued by `inventory_service.py` upon stock deduction / threshold breaches and by Celery background audits upon FEFO expiry identification
- Redis Pub/Sub dispatches alerts instantly across all worker processes without waiting for client pings
- In fallback single-worker mode without Redis, pending alerts are drained during the ping loop

**Side effects**: Push notification to active frontend client sockets


---

## GraphQL POST /graphql/analytics

**Trigger**: HTTP POST, optional authentication

**Path**:
```
api/graphql/schema.py:graphql_router → strawberry.GraphQLRouter
  → api/graphql/context.py:get_graphql_context
      → infrastructure/database/connection.py:get_db     (DB session)
      → core/dependencies.py:get_optional_user           [Optional Auth Dependency — no 401 on missing token]
  → api/graphql/resolvers.py:Query.<field resolver>
      → application/cache_service.py:cache_get(key)      (same key namespace as REST)
      → [cache MISS] application/analytics_service.py:AnalyticsService.<method>
          → infrastructure/database/queries.py:<query>   (DB SELECT)
          → domain/calculations.py:format_stock_item / calculate_reorder_quantity
      → resolvers.py:_is_privileged(user)
          → [guest/vendor] forecasting fields (avg_daily_usage, days_remaining, lead_time_days) masked to None
          → [manager/admin/super_admin] full data returned
      → cache_service.cache_set(key, result, ttl)
```

**Branches**:
- Unauthenticated caller → `get_optional_user` returns None → `_is_privileged=False` → forecasting fields masked
- GraphiQL IDE → enabled only in non-production environments (`settings.ENVIRONMENT != "production"`)
- All mutations → ⚠️ **No GraphQL mutations exist**; this schema is query-only. All writes must go through REST.

**Side effects**: Redis write on cache miss (shared with REST cache)

---

## POST /api/data-import/upload

**Trigger**: HTTP POST (multipart file upload + query parameter `target_entity`), requires staff or above

**Path**:
```
api/routes/data_import.py:upload_and_map_file
  → [limiter: 10/minute]
  → Depends(require_staff) → [Auth + Role guards]
  → Depends(get_db) → Session
  → application/data_import_service.py:DataImportService.inspect_file
      → openpyxl (for .xlsx/.xls) or csv module (for .csv) stream-reads headers + 3 sample rows
  → application/data_import_mapper.py:DataImportMapper.get_target_schema_meta
      → introspects target model (InventoryTransaction, Item, Location)
  → application/data_import_mapper.py:DataImportMapper.map_columns
      → application/cache_service.py:cache_get("import_mapping:<sha256(headers+target)>")
      → [cache HIT] return cached mapping
      → [cache MISS]
          → [if GROQ_API_KEY] langchain_groq.ChatGroq.invoke(strict JSON prompt) → Groq API
          → [if no key or LLM error] DataImportMapper._heuristic_mapper (synonym/substring match)
          → application/cache_service.py:cache_set(cache_key, result, ttl=24h)
  → infrastructure/database/data_import_repo.py:DataImportRepository.create_job
      → DB INSERT data_import_jobs (status="PENDING", file_content=raw bytes, mapping_result=JSON)
```

**Branches**:
- Target entity not in `["inventory_transaction", "item", "location"]` → `ValidationError` → HTTP 422
- Unsupported extension (not `.csv`, `.xlsx`, `.xls`) → `ValidationError` → HTTP 422
- File size > 5MB or 0 bytes → `ValidationError` → HTTP 422
- Groq API fails or unavailable → silently falls back to heuristic column mapping

**Side effects**: DB write (`data_import_jobs`), Redis cache write (mapping cache for 24h), optional external Groq API call

---

## POST /api/data-import/confirm

**Trigger**: HTTP POST (JSON body `ImportConfirmRequest`), requires staff or above

**Path**:
```
api/routes/data_import.py:confirm_and_execute_import
  → [limiter: 10/minute]
  → Depends(require_staff)
  → DataImportRepository.get_job(body.job_id)       (DB SELECT)
  → [ownership check] user_id == uploaded_by or role in ('admin', 'super_admin')
  → [status check] status in ('PENDING', 'FAILED')
  → application/audit_service.py:AuditService.log → audit_repo.create
  → [BRANCH: file size / row count check]
      → [total_rows > IMPORT_SYNC_ROW_LIMIT (500)]:
          → DB UPDATE data_import_jobs (status="PROCESSING", is_background=True)
          → threading.Thread(target=_run_background_import, daemon=True).start()   BACKGROUND THREAD
          → returns HTTP 200 immediately with status="PROCESSING", is_background=True
      → [total_rows <= 500 (sync path)]:
          → application/data_import_service.py:DataImportService.execute_import
              → stream-parses rows one by one
              → [for each row] DataImportService.transform_and_validate_row
                  → confidence gating check against thresholds (0.90 high-risk, 0.70 standard)
                  → [confidence < threshold or invalid] queue in quarantine_buffer
                  → [valid row] DataImportService._write_single_entity
                      → [inventory_transaction] InventoryService.add_transaction(flush_only=True)
                      → [item / location] InventoryRepository create/update
              → [every batch of 50 rows]
                  → DataImportRepository.add_quarantine_rows_bulk (DB INSERT import_quarantine_rows)
                  → db.commit()
              → application/cache_service.py:cache_invalidate_pattern("analytics:*")
              → DB UPDATE data_import_jobs (status="COMPLETED" / "PARTIAL" / "FAILED", counts)
```

**Branches**:
- `total_rows > 500` → executes in background daemon thread; client polls `/data-import/jobs/{id}`
- `total_rows <= 500` → executes synchronously and returns final counts immediately
- Low confidence or validation error on a row → recorded to `import_quarantine_rows`, does not block other rows

**Side effects**: DB writes (`inventory_transactions` / `items` / `locations`, `import_quarantine_rows`, `data_import_jobs`, `audit_logs`), Redis cache invalidation (`analytics:*`)

---

## GET /api/data-import/jobs/{job_id} & /quarantine

**Path**:
```
api/routes/data_import.py:get_import_job_status / get_quarantined_rows
  → Depends(require_staff)
  → DataImportRepository.get_job(job_id)             (DB SELECT)
  → [ownership check]
  → [for /quarantine] DataImportRepository.get_quarantined_rows(job_id, limit, skip) (DB SELECT)
```

---

## FastAPI Lifespan (Startup / Shutdown)

**Trigger**: Server process start (`uvicorn app.main:app`)

**Path**:
```
app/main.py:lifespan (asynccontextmanager)
STARTUP:
  → core/config.py:configure_langsmith()         (mutates os.environ if LANGCHAIN_API_KEY set)
  → infrastructure/database/connection.py:Base.metadata.create_all(bind=engine)
      → SQLAlchemy CREATE TABLE IF NOT EXISTS for all models
  → app/main.py:seed_admin_user()
      → DB SELECT users WHERE role='super_admin' / role='admin'
      → [no admin found] core/security.py:hash_password → DB INSERT users
  → infrastructure/cache/redis_client.py:get_redis()   (ping Upstash, log status)
  → api/routes/websocket.py:start_redis_subscriber()   (asyncio task subscribed to inviq:ws:alerts)

SHUTDOWN:
  → subscriber_task.cancel()                            (cancel WebSocket Redis listener)
  → infrastructure/cache/redis_client.py:close_redis()  (clear singleton reference)
  → infrastructure/database/connection.py:engine.dispose()   (close connection pool)
```

**Branches**:
- Admin already exists → seed skipped (idempotent)
- `LANGCHAIN_API_KEY` not set → LangSmith tracing stays disabled
- Redis unavailable → logged as warning, server starts with local in-memory cache and in-process WebSocket queue

---

## ⚠️ Unreferenced / Notable Observations

- **`get_optional_user` in `chat.py`** — imported (`from app.core.dependencies import get_current_user, get_optional_user`) but `get_optional_user` is only used in the `GET /chat/suggestions` route. The `POST /chat/query` route uses the strict `get_current_user`.
- **`github-auth` route** — auth.py contains a `POST /github-auth` endpoint that calls GitHub's OAuth API. The full OAuth code-exchange flow is implemented. Verified present and wired.
- **`InventoryService._get_recipient_emails` cache** — is a class-level mutable list shared across all instances. Thread-safe under the double-checked lock; TTL is 60 seconds.
- **`vendor_upload` cache invalidation** — [RESOLVED] `POST /vendor/upload-delivery` calls `cache_invalidate_pattern("analytics:*")` on success.
- **`pending_alerts` multi-worker pub/sub** — [RESOLVED] `queue_websocket_alert` publishes to Redis channel `inviq:ws:alerts`. Alerts are broadcast in real-time across workers via `start_redis_subscriber()`.
- **`seed_chat_memory.py` and `seed_large_data.py`** (backend root) — standalone scripts for seeding Qdrant and DB data. Not wired into any route, cron, or lifecycle hook. Must be run manually.

