# Tutorial: three production apps with nothing but OpenCode Zen

> The premise is deliberately extreme. **No design team, no backend team, no
> DevOps.** One developer, a free/cheap AI coding agent (OpenCode + a
> DeepSeek-class model), and the Ecosphere LXS catalog. What can you ship?

Short answer: **production applications** — because the hard 20% (auth, photos,
notifications, email, payments, shipping) already exists as reusable Linux
Services with contracts. The AI only does the plumbing, and plumbing is exactly
what an AI does best.

Each walkthrough below maps to a real estate shape on the platform, lists which
LXS you compose in, and shows what you alone must build.

---

## 1. A marketplace

A multi-vendor marketplace with listings, bidding, chat, and payments.

**Compose in as ready LXS:**

| Domain | LXS |
| --- | --- |
| Accounts | `auth` — login, register, JWT, roles (buyer/vendor/admin) |
| Product images | `photos` — uploads, thumbnails, video re-encoding |
| Conversations | `chat` — WebSocket hub, one connection per session |
| Notifications | `notifications` — in-app + email on bids, orders, messages |
| Payments | `payments` — checkout, escrow, per-vendor splits |

**You build (the core domain):** the product catalog, the bidding engine, the
order workflow, the vendor dashboard. This is the differentiator — your AI
focuses here.

```yaml
# ecompose.yml (the whole estate, one file)
project: my-marketplace

services:
  backend:
    path: marketplace/backend        # you build this
    runtimes: [rust, postgresql@15]
  auth-backend:
    path: auth/backend               # ready LXS
    runtimes: [rust, mongodb@7]
  photos-backend:
    path: photos/backend             # ready LXS
    runtimes: [rust]
  chat-backend:
    path: chat/backend               # ready LXS
    runtimes: [rust, mongodb@7]
  notifications-backend:
    path: notifications/backend      # ready LXS
    runtimes: [rust, mongodb@7]
```

Then:

```bash
eco up --remote        # cross-compiles your backend on this machine,
                       # ships all binaries to the Ecosphere agent, runs them
```

**What it costs you:** your core domain only. Everything else was built once,
by domain authors, and is amortized across every estate that uses it.

---

## 2. An online assessment platform

A school assessment platform: psychometric tests (DISC, Holland, IQ), student
management, counselor dashboards, PDF certificates.

**Compose in as ready LXS:**

| Domain | LXS |
| --- | --- |
| Accounts + roles | `auth` — students, counselors (guru BK), schools, admins |
| Email | `email-manager` — verification links, result notifications |
| Files | `photos` — question images, certificate assets |
| Notifications | `notifications` — "your results are ready" |
| Payment / fee split | `payments` — per-student fees, school splits |

**You build (the core domain):** the five instruments and their scoring engines
(DISC, Holland, PAPI, CFIT, IST), the exam flow, the report generation. Pure
domain logic — no infrastructure.

The scoring engines are exactly the kind of thing an AI agent nails quickly:
deterministic, well-specified, table-driven rules. Your Zen session owns them;
the platform owns everything around them.

---

## 3. A CRM for a services agency

A sales CRM with leads, pipelines, invoicing, and drip email.

**Compose in as ready LXS:**

| Domain | LXS |
| --- | --- |
| Accounts + roles | `auth` — staff, managers, per-tenant roles |
| Email + templates | `email-manager` — drip campaigns, invoice notices |
| Notifications | `notifications` — lead assigned, deal moved |
| File attachments | `photos` — documents, contracts |
| Payments | `payments` — invoices, subscriptions |

**You build (the core domain):** the lead model, the pipeline stages, the
scoring/routing rules, the reporting. Again — the differentiator only.

---

## The pattern, generalized

Every archetype reduces to the same formula:

```
you build  =  the core domain (the thing that makes your product yours)
you get    =  every supporting domain, already built and contracted
```

| | Marketplace | Assessment | CRM |
| --- | --- | --- | --- |
| Ready LXS | 5 | 5 | 5 |
| Your core | catalog, bids, orders | instruments, scoring, exams | leads, pipeline, invoicing |
| Infra you touch | none | none | none |
| Free tier hosting | `<name>.getecosphere.com` | same | same |

That is the whole promise: **a Zen-level budget ships an Opus-level product**,
because the expensive 20% is not yours to build.

---

## Going further

- [Introducing LXS](/ecosphere/) — the platform and the journey behind it
- [Why Rust & Go?](/ecosphere/why-rust-and-go) — why binaries make this possible
- [Guide: Getting Started](/guide/getting-started) — run your first estate
- [The `rag` domain](/reference/domains) — the full LXS catalog
