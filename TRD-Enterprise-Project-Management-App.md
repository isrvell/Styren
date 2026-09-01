# Technical Requirements Document (TRD)
## Enterprise Project Management Platform

**Version:** 1.0
**Status:** Draft for Review
**Owner:** Engineering
**Companion Document:** PRD-Enterprise-Project-Management-App.md

---

## 1. Purpose & Scope

This document translates the PRD into a technical architecture and implementation plan: system architecture, data model, APIs, permission enforcement, billing engine, GitHub integration, and non-functional/operational requirements.

---

## 2. High-Level Architecture

### 2.1 Architectural Style
Modular monolith at launch, structured so individual domains (Billing, GitHub Sync, Notifications) can be extracted into separate services as scale demands, without a full rewrite. This avoids premature microservice overhead while keeping clean domain boundaries.

### 2.2 System Diagram (Logical)

```
                         ┌─────────────────────┐
                         │   Web Client (SPA)   │
                         └──────────┬───────────┘
                                    │ HTTPS / WebSocket
                         ┌──────────▼───────────┐
                         │   API Gateway / BFF   │
                         │ (Auth, Rate Limiting) │
                         └──────────┬───────────┘
                                    │
        ┌───────────────┬──────────────────────┬───────────────┐
        │               │                       │               │
 ┌──────▼─────┐  ┌──────▼─────┐          ┌──────▼───┐   ┌──────▼──────┐
 │ Core Domain│  │  Billing   │          │ GitHub   │   │ Notification│
 │  Service   │  │  Service   │          │  Sync    │   │  Service    │
 │(Org/Task/  │  │(Plans/Usage│          │  Service │   │(Email/Push/ │
 │ Project)   │  │/Invoices)  │          │          │   │  In-App)    │
 └──────┬─────┘  └──────┬─────┘          └───┬──────┘   └──────┬──────┘
        │               │                    │                  │
        └───────────────┴────────────────────┴──────────────────┘
                              │
                  ┌───────────▼────────────┐
                  │   Event Bus (Kafka /    │
                  │   equivalent)           │
                  └───────────┬────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                       │
 ┌──────▼──────┐     ┌────────▼────────┐     ┌───────▼───────┐
 │  Primary DB  │     │  Search Index    │     │  Object Store │
 │ (PostgreSQL, │     │ (Elasticsearch/  │     │ (S3-compatible│
 │  multi-tenant│     │  OpenSearch)     │     │  for files)   │
 │  schema)     │     └─────────────────┘     └───────────────┘
 └─────────────┘
        │
 ┌──────▼──────┐
 │  Cache Layer │
 │  (Redis)     │
 └──────────────┘
```

### 2.3 Key Technology Choices (Recommended)
- **Frontend**: React + TypeScript SPA, with a real-time layer (WebSocket via a service like Ably/Pusher or self-hosted socket cluster) for live board updates.
- **Backend**: Node.js/TypeScript or Go for core services (either is viable; pick one and standardize — recommend Node/TypeScript for team velocity and shared types with frontend).
- **Database**: PostgreSQL as the system of record, with row-level multi-tenancy (organization_id on all tenant-scoped tables) and partitioning for large tables (tasks, activity_log) as data grows.
- **Search**: OpenSearch/Elasticsearch for full-text task/comment search and complex filter queries at scale.
- **Cache/Queue**: Redis for caching, session state, and rate limiting; a durable message broker (Kafka, or managed equivalent like AWS SQS/SNS or GCP Pub/Sub) for async events (webhooks, notifications, billing usage events).
- **File Storage**: S3-compatible object storage for attachments, with signed URLs for secure access.
- **Infra**: Containerized services (Docker) orchestrated via Kubernetes; infrastructure as code (Terraform).

---

## 3. Multi-Tenancy & Data Isolation

- Every tenant-scoped table includes an `organization_id` (or a sentinel value representing a personal account's implicit "org-of-one").
- Enforce isolation at two layers:
  1. **Application layer**: every query is scoped by the authenticated user's active organization context.
  2. **Database layer**: PostgreSQL Row-Level Security (RLS) policies as a defense-in-depth backstop against application bugs.
- Large enterprise customers may be placed on dedicated database shards/clusters for performance isolation and compliance; the data access layer abstracts this so application code doesn't need to know the physical shard.

---

## 4. Core Data Model

### 4.1 Entity-Relationship Overview

```
User ──< OrganizationMembership >── Organization
                                        │
                                        ├─< Workspace
                                        │      │
                                        │      └─< Space
                                        │             │
                                        │             └─< Project ──< ProjectMember >── User
                                        │                    │
                                        │                    ├─< StatusDefinition
                                        │                    ├─< Label
                                        │                    ├─< SavedView
                                        │                    ├─< Sprint (if Scrum)
                                        │                    │
                                        │                    └─< Task
                                        │                          ├─< Task (subtasks, self-referential)
                                        │                          ├─< TaskAssignment >── User
                                        │                          ├─< TaskLabel >── Label
                                        │                          ├─< Comment
                                        │                          ├─< TimeEntry
                                        │                          ├─< Attachment
                                        │                          ├─< TaskLink (blocks/relates/duplicates)
                                        │                          └─< GitHubLink (issue/PR/commit)
                                        │
                                        ├─< Role / CustomRole
                                        ├─< BillingAccount ──< Invoice, UsageRecord
                                        └─< AuditLogEntry
```

### 4.2 Key Table Sketches

**organizations**
`id, name, slug, plan_id, billing_status (active/past_due/read_only/suspended), created_at`

**users**
`id, email, name, auth_provider, is_personal_account_owner, created_at`

**organization_memberships**
`id, org_id, user_id, role_id, status (invited/active/removed), joined_at`

**workspaces**
`id, org_id, name, settings (jsonb: default_statuses, default_view), created_at`

**spaces**
`id, workspace_id, name, created_at`

**projects**
`id, space_id, name, methodology (scrum/kanban), is_private, created_at`

**status_definitions**
`id, project_id, name, category (not_started/active/done), position, workflow_rules (jsonb)`

**tasks**
`id, project_id, parent_task_id (nullable, for subtasks), title, description, status_id, priority, estimate, start_date, due_date, created_by, created_at, updated_at`

**task_assignments**
`id, task_id, user_id, assigned_at`

**labels**
`id, scope (workspace/project), scope_id, name, color`

**task_labels**
`task_id, label_id`

**comments**
`id, task_id, author_id, body (rich text/markdown), created_at, edited_at`

**time_entries**
`id, task_id, user_id, duration_seconds, billable (bool), started_at, note`

**saved_views**
`id, scope (project/workspace), scope_id, owner_id (nullable if shared), name, filters (jsonb), sort, grouping`

**sprints**
`id, project_id, name, start_date, end_date, goal, status (planned/active/completed)`

**github_links**
`id, task_id, repo_full_name, link_type (issue/pr/commit/branch), external_id, status_cache (jsonb), last_synced_at`

**roles / custom_roles**
`id, org_id (null for system default roles), name, permissions (jsonb bitmask or permission-key list), scope_level (org/workspace/project)`

**billing_accounts**
`id, org_id, plan_id, seat_count, payment_method_ref, current_period_start, current_period_end`

**usage_records**
`id, org_id, metric (seats/storage_gb/api_calls/guest_seats), value, recorded_at`

**invoices**
`id, org_id, period_start, period_end, line_items (jsonb), total_amount, status (paid/open/failed), pdf_url`

**audit_log_entries**
`id, org_id, actor_id, action, target_type, target_id, metadata (jsonb), created_at`

### 4.3 Indexing & Performance Notes
- Composite index on `(project_id, status_id)` for board queries.
- Composite index on `(org_id, created_at)` on high-volume tables (`audit_log_entries`, `activity_events`) to support retention-based partitioning.
- Full-text search index (via OpenSearch, fed by CDC from Postgres) on `tasks.title`, `tasks.description`, `comments.body`.
- `tasks` table partitioned by `project_id` range or by time once row counts justify it (e.g., >50M rows).

---

## 5. API Design

### 5.1 API Style
- **Primary API**: REST/JSON for CRUD operations (`/v1/organizations/{id}/projects/{id}/tasks`), versioned via URL path.
- **Real-time**: WebSocket channel per project/board for live task updates (status changes, new comments, assignment changes) so boards update without polling.
- **Public API (Enterprise)**: A subset of endpoints exposed for customer-built integrations, with API key or OAuth2 client-credentials auth, rate-limited per plan tier, and usage tracked for billing.
- **Webhooks**: Outbound webhooks for key events (`task.created`, `task.status_changed`, `comment.created`, `project.archived`) so customers can build their own automations.

### 5.2 Example Endpoints

```
POST   /v1/orgs/{orgId}/workspaces
POST   /v1/workspaces/{workspaceId}/spaces
POST   /v1/spaces/{spaceId}/projects
GET    /v1/projects/{projectId}/tasks?status=&assignee=&label=&view=
POST   /v1/projects/{projectId}/tasks
PATCH  /v1/tasks/{taskId}
POST   /v1/tasks/{taskId}/subtasks
POST   /v1/tasks/{taskId}/comments
POST   /v1/tasks/{taskId}/time-entries
POST   /v1/projects/{projectId}/saved-views
POST   /v1/projects/{projectId}/github-links
GET    /v1/orgs/{orgId}/billing/usage
GET    /v1/orgs/{orgId}/billing/invoices
```

### 5.3 Authentication & Authorization
- **AuthN**: OAuth2/OIDC for social login; SAML 2.0 for enterprise SSO; email/password with mandatory MFA option.
- **Session**: Short-lived JWT access tokens + refresh tokens; refresh tokens revocable per-device from account settings.
- **AuthZ**: Centralized permission-check middleware evaluated on every request:
  1. Resolve the actor's role(s) for the resource's org/workspace/project scope.
  2. Resolve effective permissions (role + custom role overrides).
  3. Check requested action against effective permissions before hitting the domain service.
- Permission checks are also enforced at the data layer (RLS) as defense-in-depth, not just in middleware.

---

## 6. Permission Engine Design

- Permissions represented as a set of string keys, e.g. `project.task.create`, `project.task.delete`, `org.billing.manage`, `org.member.invite`.
- **System roles** ship with predefined permission sets (Org Owner, Org Admin, Workspace Admin, Project Manager, Member, Guest/Viewer) per PRD §5.1.
- **Custom roles** store a permission-key list; effective permission = union of role grants at the most specific applicable scope, with explicit deny overrides supported for edge cases (e.g., "Member, but cannot delete tasks in this project").
- Permission resolution is cached per (user, org) in Redis with short TTL, invalidated on role/membership change events.
- All permission and role-mutation actions are written to `audit_log_entries` synchronously (not best-effort async) to guarantee audit completeness.

---

## 7. Billing & Usage Metering

### 7.1 Usage Collection
- Each billable action emits a usage event onto the event bus (e.g., `usage.seat_added`, `usage.ai_credit_consumed`, `usage.storage_delta`, `usage.api_call`).
- A dedicated **Usage Aggregator** consumes these events, upserts running totals into `usage_records`, and evaluates against the org's plan limits.
- Aggregation runs both in near-real-time (for in-app usage meters) and via nightly batch reconciliation (to correct for any dropped events and produce authoritative billing figures).

### 7.2 Limit Enforcement
- Soft limits (80%, 100% of plan) trigger notification events consumed by the Notification Service.
- Hard limits are enforced at the point of action: before creating a resource that would exceed a hard-capped metric (e.g., seats), the Core Domain Service calls the Billing Service's `checkEntitlement()` synchronously and blocks the action with a clear error if exceeded and overage billing is not enabled.
- Overage-enabled orgs are allowed past soft caps, with overage usage recorded and included in the next invoice.

### 7.3 Invoicing
- Integrate with a payment processor (e.g., Stripe Billing) to handle subscription line items, proration, and payment collection; usage-based line items generated by the Usage Aggregator are pushed to the processor at period close.
- Invoice PDF generation via a templating service; stored in object storage, linked from `invoices.pdf_url`.
- Dunning managed largely via the payment processor's built-in retry logic, with our system reacting to webhook events (`invoice.payment_failed`, `invoice.payment_succeeded`) to update `billing_status`.

### 7.4 Suspension State Machine
```
active ──(payment fails, grace period starts)──▶ past_due
past_due ──(grace period expires)──▶ read_only
read_only ──(payment resolved)──▶ active
read_only ──(extended non-payment)──▶ suspended
suspended ──(payment resolved within retention window)──▶ active
suspended ──(retention window expires)──▶ scheduled_for_deletion
```
- `billing_status` on the `organizations` table drives a global middleware check: `read_only` blocks all write endpoints except billing management; `suspended` blocks all endpoints except login and billing management for the Org Owner.

---

## 8. GitHub Integration Design

### 8.1 Connection
- Implemented as a **GitHub App** (not just OAuth) to get fine-grained repository permissions and webhook support without relying on a single user's personal token.
- Org Admin installs the GitHub App at the GitHub organization level and selects accessible repositories; installation token stored encrypted, scoped per our `organization_id`.

### 8.2 Sync Mechanics
- **Inbound**: GitHub webhooks (`issues`, `pull_request`, `push`, `check_run`) received by the GitHub Sync Service, parsed for task-ID references (e.g., regex for `PROJ-123` in PR titles/branch names/commit messages), and used to update `github_links` and trigger configured status-transition rules.
- **Outbound**: When a task is linked manually, or when configured automation requires it (e.g., auto-create a GitHub issue when a task enters "Ready for Dev"), the service calls the GitHub REST/GraphQL API.
- **Status transition rules** are stored per project as configuration (`{on: "pr_merged", set_status: "Done"}`) and evaluated by a rules engine within the GitHub Sync Service.
- Two-way sync conflict handling: last-write-wins with a recorded audit entry; a configurable "GitHub is source of truth for status" toggle avoids status ping-pong for projects that want it.

### 8.3 Rate Limits & Resilience
- Respect GitHub's REST/GraphQL rate limits with per-installation token bucket tracking; queue and backoff outbound calls when near limits.
- Webhook processing is idempotent (dedup by GitHub delivery ID) and retried via the event bus's dead-letter queue on failure.

---
## 9. Real-Time & Collaboration Layer

- Board/list views subscribe to a WebSocket channel scoped to `project:{id}`.
- Task mutations publish a domain event, which is fanned out to connected clients on the relevant project channel, containing the diff needed to update the UI without a full refetch.
- Comment typing indicators and presence (who's viewing a task) are lightweight, ephemeral state carried over the same channel — not persisted.
- Reconnection logic performs a delta sync (last-seen event cursor) rather than a full reload where feasible.

---

## 10. Security Requirements

- Encryption in transit (TLS 1.2+) and at rest (database and object storage encryption).
- Secrets (GitHub App keys, payment processor keys) stored in a managed secrets vault, never in application config files or source control.
- MFA support (TOTP at minimum) for all account types; enforceable as mandatory by Org Admins for enterprise orgs.
- SSO/SAML for enterprise orgs, with just-in-time provisioning and de-provisioning tied to IdP group membership.
- Full audit logging (who did what, when, from where) retained per configurable policy (default 1 year, extendable for Enterprise).
- Regular third-party penetration testing and a documented vulnerability disclosure process.
- Tenant data export and deletion workflows to support data portability and compliance (e.g., GDPR "right to erasure").

---

## 11. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Availability | 99.9% uptime for paid tiers; multi-AZ deployment |
| Latency | P95 API response < 300ms for standard CRUD; board load < 1.5s at 5,000 tasks |
| Scalability | Support orgs with 10,000+ users and projects with 50,000+ tasks without architecture change |
| Backup/DR | Automated daily backups, point-in-time recovery, documented RTO ≤ 4h / RPO ≤ 15min |
| Observability | Centralized logging, distributed tracing across services, SLO-based alerting |
| Compliance | SOC 2 Type II readiness at GA; GDPR-compliant data handling from day one |

---

## 12. Deployment & Environments

- Environments: `dev`, `staging`, `production`, with production further split by region if data residency requirements demand it (e.g., EU-resident org data kept in an EU cluster).
- CI/CD: automated test suite (unit, integration, contract tests for API) gating deploys; blue/green or canary deploys for the core service to minimize downtime risk.
- Feature flag system to gate rollout of new features (e.g., new billing logic, GitHub sync rules) per org, supporting gradual rollout and quick kill-switch.

---

## 13. Migration & Rollout Considerations

- Since Scrum/Kanban mode switching must preserve task data, the schema treats `methodology` as a project-level display/behavior flag rather than separate table structures — statuses and sprints are still just relational data, avoiding a costly migration when a project changes mode.
- Initial GA can launch without the public API/webhooks (Enterprise-only, later phase) since internal REST endpoints can be reused once auth/rate-limiting for external consumers is added — no data model changes required later.
- Billing engine should be built usage-aware from day one (even if Phase 1 only bills per-seat) so Phase 2's usage-based billing doesn't require a schema migration on `usage_records` — that table exists from the start, just underused initially.

---

## 14. Open Technical Questions

1. Node/TypeScript vs. Go for core services — needs a spike/prototype to validate team throughput and hiring pool before committing.
2. Do we need dedicated per-tenant database clusters for the largest enterprise customers at launch, or can shared clusters with RLS handle initial enterprise scale?
3. What is the webhook delivery guarantee we want to offer (at-least-once with dedup key vs. at-most-once), and how do we communicate that to API consumers?
