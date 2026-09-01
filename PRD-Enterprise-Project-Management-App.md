# Product Requirements Document (PRD)
## Enterprise Project Management Platform

**Version:** 1.0
**Status:** Draft for Review
**Owner:** Product Management

---

## 1. Overview

### 1.1 Purpose
This document defines the product requirements for a project management platform aimed at teams of all sizes — from individuals and small teams to large enterprises. The product should feel modern and lightweight for a new user signing up on their own, while offering the structure, permissions, and controls that large organizations need.

### 1.2 Vision
A single tool that grows with a team: someone starts with a free personal account to organize their own work, then invites teammates, forms an organization, and eventually operates the tool as the system of record for delivery across dozens of departments — with enterprise-grade governance, billing, and integrations layered in without adding friction for day-to-day use.

### 1.3 Goals
- Fast, frictionless onboarding for individuals and small teams.
- A clear organizational hierarchy that scales from one person to thousands.
- Flexible work tracking that supports both Scrum and Kanban, plus custom workflows.
- Enterprise-grade access control, auditability, and billing.
- Deep GitHub integration so engineering work stays in sync with project tracking.

### 1.4 Non-Goals (v1)
- Native mobile apps (responsive web only in v1; mobile app is a future phase).
- Gantt-chart-based portfolio/program management (may follow as "Advanced Planning" add-on).
- Native integrations beyond GitHub (Slack, Jira import, etc. are phase 2+).
- Full double-entry accounting; billing covers subscriptions/usage, not general invoicing.

---

## 2. Target Users & Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Individual / Freelancer** | Signs up with a personal account, no org | Fast setup, personal task tracking, low cost |
| **Team Lead / PM** | Runs a team's day-to-day delivery | Boards, sprints, reporting, task assignment |
| **Engineering Manager** | Oversees multiple squads | Cross-project visibility, GitHub sync, custom workflows |
| **Org Admin / IT** | Manages the organization account | User provisioning, roles, security, billing |
| **Executive / Stakeholder** | Occasional viewer | Read-only dashboards, saved views, reporting |
| **Finance / Billing Admin** | Manages the commercial relationship | Usage visibility, invoices, plan changes |

---

## 3. Account & Organization Model

### 3.1 Account Types
- **Personal Account**: A user signs up independently. They can create personal Workspaces and Projects at no cost (within free-tier limits), without belonging to any organization.
- **Organizational Account**: A company-level entity that one or more users administer. Users can be invited into an organization, or an existing personal-account user can join one while retaining their personal account/history separately.

### 3.2 Hierarchy
```
Organization
 └─ Workspace (e.g., "Product & Engineering", "Marketing")
     └─ Space (e.g., "Mobile App Team", "Website Team")
         └─ Project (e.g., "Q3 Redesign")
             └─ Task
                 └─ Subtask
```
- A **Personal Account** without an org still has this same hierarchy, scoped to just that user (a personal "organization-of-one" under the hood).
- **Workspaces** map to business units, departments, or client accounts.
- **Spaces** map to teams within a workspace.
- **Projects** map to a body of work with a start/end or ongoing cadence (e.g., a sprint-based product project or an ongoing operations board).

### 3.3 Joining & Invitations
- Org admins invite users by email or shareable domain-based auto-join (e.g., anyone with an `@company.com` email can request to join, pending approval).
- A user can belong to multiple organizations and switch between them and their personal account from a single login.
- SSO/SAML support for enterprise orgs (see TRD) so IT can enforce identity provider-based login.

---

## 4. Core Feature Requirements

### 4.1 Workspaces, Spaces, Projects
- Create/rename/archive/delete at each level, with role-based permission checks.
- Each level can carry its own default settings (e.g., default task statuses, default view) that are inherited downward but overridable.
- Projects support two primary methodologies out of the box:
  - **Scrum**: sprints with start/end dates, sprint planning, backlog, burndown/velocity charts, sprint retrospective notes.
  - **Kanban**: continuous flow board with WIP limits per column.
- A project can be switched between Scrum and Kanban modes without losing task data.

### 4.2 Tasks & Subtasks
- Tasks have: title, description (rich text), status, assignee(s), priority, labels, due date, start date, estimate (points or time), attachments, custom fields.
- Subtasks are first-class tasks nested under a parent, roll up progress to the parent (e.g., "3 of 5 subtasks done").
- Tasks can be linked to other tasks (blocks / blocked by / relates to / duplicates) across projects.
- Bulk actions: multi-select tasks to change status, assignee, labels, or move between projects.

### 4.3 Custom Statuses & Workflows
- Each project defines its own status pipeline (e.g., Backlog → To Do → In Progress → In Review → Done), rather than being locked to a fixed set.
- Statuses are grouped into categories (Not Started / Active / Done) so cross-project reporting still works even when label names differ.
- Optional workflow rules: e.g., a task cannot move to "Done" if it has open subtasks; moving to "In Review" auto-assigns the reviewer.

### 4.4 Labels, Assignees, Comments
- Labels are workspace-level or project-level tags with color coding; support filtering and saved views.
- Tasks support multiple assignees plus a single "owner" concept for accountability, if the org enables multi-assignee mode.
- Comments support @mentions, rich text, file attachments, emoji reactions, and threaded replies. Mentioned users get notified in-app/email/Slack (future).

### 4.5 Time Tracking
- Manual time entry and a start/stop timer per task.
- Time entries roll up to task, project, and user-level reports.
- Optional: mark time as billable/non-billable, useful for agencies/consultancies.
- Export time reports (CSV) for external payroll/invoicing use.

### 4.6 Saved Views
- Users can save a filtered/sorted/grouped configuration of a board or list (e.g., "My open bugs, sorted by priority") as a personal or shared view.
- Views support filters by assignee, label, status, due date, priority, custom field, and free-text search.
- Shared views are visible to everyone with project access; personal views are private to the creator.

### 4.7 Reporting & Dashboards
- Pre-built dashboards: sprint burndown, velocity trend, cumulative flow diagram (Kanban), workload by assignee, overdue tasks.
- Custom dashboard widgets that can be assembled by a user from available report types.
- Org-level and workspace-level roll-up reporting for managers overseeing multiple teams.

---

## 5. Permissions & Access Control

### 5.1 Roles
Default roles, each configurable at the org level:

| Role | Scope | Typical Capabilities |
|---|---|---|
| **Org Owner** | Organization | Full control, billing, can delete org |
| **Org Admin** | Organization | Manage members, roles, security settings, integrations |
| **Workspace Admin** | Workspace | Manage spaces/projects within a workspace, manage workspace members |
| **Project Manager** | Project | Configure workflows, manage members, edit all tasks |
| **Member** | Project/Space | Create/edit/comment on tasks they have access to |
| **Guest / Viewer** | Project | Read-only access, optionally can comment |

### 5.2 Permission Model
- Role-based access control (RBAC) as the default, with the option for **custom roles** that combine granular permissions (e.g., "can edit tasks" but "cannot delete project").
- Permissions can be scoped at Organization, Workspace, Space, or Project level; more specific scopes can restrict but not necessarily broaden org-level restrictions.
- Admins can control: who can view a workspace/space/project, who can create/delete projects, who can change task statuses, who can manage billing, who can invite members, who can install/configure integrations.
- Sensitive projects can be marked **private**, visible only to explicitly added members regardless of workspace membership.
- Full audit log of permission and role changes, visible to Org Admins.

### 5.3 Guest Access
- External guests (e.g., clients, contractors) can be invited to specific projects without full org membership, with restricted visibility and no access to billing or org settings.

---

## 6. Billing & Usage

### 7.1 Plan Structure
- **Free**: Personal accounts and small teams, capped seats/projects/storage.
- **Team**: Paid per-seat plan for small-to-mid orgs, higher limits, standard integrations.
- **Business**: Adds advanced permissions, SSO, guest access, priority support.
- **Enterprise**: Custom contracts, usage-based components, dedicated support, advanced audit/compliance features.

### 7.2 Usage-Based Billing
- Billable dimensions may include: active seats, storage used, API call volume (for Enterprise API usage), guest seats.
- Organizations see real-time usage against plan limits in a billing dashboard.
- Soft limits trigger in-app warnings and admin email notifications as usage approaches the cap (e.g., 80%, 100%).
- Hard limits (if configured) block specific actions (e.g., new task creation) once exceeded, unless the org has usage-based overage billing enabled.

### 7.3 Invoicing
- Automatic monthly (or annual) invoice generation, itemized by seat count and usage-based charges.
- Invoices available for download (PDF) and viewable in-app; integrates with common payment processors for card and ACH/wire payment.
- Dunning process for failed payments: retries, admin notifications, grace period.

### 7.4 Suspension & Recovery
- Non-payment beyond a grace period results in **read-only mode** first (data preserved, no edits), then full **suspension** (login blocked except for billing admin) if unresolved.
- Clear in-app and email communication at each stage, with a self-service path to update payment and restore access.
- Org data is retained for a defined period post-suspension before deletion, per data retention policy.

---

## 7. GitHub Integration

### 8.1 Linking
- Org/workspace admins can connect one or more GitHub organizations/repositories to the platform via OAuth App / GitHub App installation.
- Individual projects can be linked to one or more repositories.

### 8.2 Sync Behavior
- Tasks can be linked to GitHub issues, pull requests, branches, and commits.
- Creating a branch or PR referencing a task ID (e.g., `PROJ-123`) automatically links it and can transition the task's status (e.g., PR opened → "In Review"; PR merged → "Done") based on configurable rules.
- Commit messages referencing a task ID appear as activity on the task timeline.
- Optional two-way sync: closing a linked GitHub issue can close/update the corresponding task, and vice versa (configurable per project to avoid conflicting states).

### 8.3 Visibility
- Task detail view shows linked PR status (open/draft/approved/merged), CI check status, and reviewers, without requiring a context switch to GitHub.

---

## 8. Non-Functional Requirements (Product-Level)

- **Usability**: New user can create their first project and task within 3 minutes of signup, unassisted.
- **Performance**: Board and list views load in under 1.5s for projects with up to 5,000 tasks.
- **Availability**: 99.9% uptime SLA for paid plans.
- **Accessibility**: WCAG 2.1 AA compliance for core workflows.
- **Localization**: UI translatable; v1 ships in English, architecture supports adding locales later.
- **Data portability**: Orgs can export all their data (tasks, comments, attachments) at any time in a documented format.

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Time to first created task (new signup) | < 3 minutes |
| Weekly active projects per paid org | Trending upward MoM |
| Free-to-paid conversion rate | Baseline TBD after launch, track quarterly |
| GitHub-linked projects (of eligible orgs) | 40%+ adoption within 6 months of GA |
| Support tickets related to permissions confusion | < 5% of total tickets |

---

## 10. Release Phasing (High-Level)

- **Phase 1 (MVP)**: Personal + org accounts, workspace/space/project/task hierarchy, Kanban + basic Scrum, comments, labels, RBAC roles, basic billing (seat-based only).
- **Phase 2**: Time tracking, saved views, custom workflows, GitHub integration, usage-based billing, invoicing automation.
- **Phase 3**: Guest access, SSO/SAML, advanced audit logs.
- **Phase 4**: Advanced reporting/dashboards, custom roles, API/webhooks for third-party integrations, additional integrations beyond GitHub.

---

## 11. Open Questions

1. Should personal accounts ever be forcibly merged into an org (e.g., when a company mandates it), or should they always remain separable?
2. What is the maximum guest-to-member ratio we want to support before requiring a paid guest seat?
3. Do we support on-premise/self-hosted deployment for the largest enterprise customers, or SaaS-only?
