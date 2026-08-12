# Domain Catalog

The domain catalog is Eco's registry of reusable building blocks. It lives in `eco/repos.json` — the single source of truth for which domains exist, where they live, what they require, and how they are composed into estates.

## How the catalog works

Each entry declares a domain's identity and its dependency graph:

```json
{
  "name": "notifications",
  "description": "Reusable in-app notifications domain: persistent notifications, read/unread state, unread counts, and realtime WebSocket delivery",
  "git": "git@github.com:eco/notifications.git",
  "branch": "main",
  "requires": ["auth"]
}
```

- `name` — the domain identity used in `ecompose.yml` (`domains:` list)
- `git` — where the domain lives
- `branch` — the shared catalog branch (`main`); estates can override per-project
- `requires` — declared dependencies, enforced during composition

A composition app declares the domains it wants; Eco clones them, resolves the dependency graph, and wires them together. **Adding a domain to an estate is adding a line to the `domains:` list.**

## Reusable support domains

These are the "public" building blocks — generic, reusable capability domains that any estate can compose. They carry their contract in their own `CLAUDE.md`, so a new estate inherits a veteran-designed boundary, not a bespoke implementation.

### auth

The identity foundation. Owns credentials, sessions, and JWTs — plus avatar/cover-photo upload. Every other domain depends on it. Written in Rust (axum), rewritten from an earlier Java/Spring implementation to a leaner, cheaper service.

- **Requires:** — (root domain)
- **Stack:** Rust, MongoDB, JWT, bcrypt, rate limiting

### photos

Reusable media storage for any estate. Stores images and documents in S3-compatible MinIO; consumers receive opaque object keys and never touch S3 details. Image processing (thumbnails, WebP) is handled here.

- **Requires:** auth
- **Stack:** Rust, MinIO/S3, image processing

### notifications

Reusable in-app notifications: persistent notifications, read/unread state, unread counts, and realtime delivery over a per-user WebSocket stream. Producing domains list explicit recipients; email stays in auth, so this domain is in-app only.

- **Requires:** auth
- **Stack:** Go, MongoDB, WebSocket

### chat

Reusable conversations domain: persistent messages in MongoDB, live updates over WebSocket, and storage references handled by the independent photos domain. Includes sticker packs and attachment references.

- **Requires:** auth, photos, notifications
- **Stack:** Rust, MongoDB, Redis, WebSocket

### rag

Reusable Retrieval-Augmented Generation support domain. Answers questions about an estate by grounding DeepSeek on the estate's own docs and code. Owns its index (ingestion, chunking, embeddings via local fastembed/ONNX) and degrades gracefully when the model or LLM is unavailable.

- **Requires:** — (standalone support domain)
- **Stack:** Rust (axum), MongoDB, fastembed/ONNX, DeepSeek

### email-manager

Reusable transactional email domain. Owns outbound delivery for an estate: queueing, rate limiting, anti-spam (per-recipient caps, global hourly budget, warm-up ramp for new sender domains, and a suppression list for hard bounces, spam reports, and unsubscribes), and per-message delivery status. Other domains call it instead of talking to a mail provider directly.

- **Requires:** — (standalone support domain)
- **Stack:** Rust (axum), MongoDB, Brevo

### contact-form

Reusable contact/lead capture domain. Owns consent, rate-limited submissions (per IP and per email, plus a bot honeypot), and notifies the estate owner through email-manager. Ships a dependency-free `<eco-contact-form>` frontend widget any estate can drop onto a page.

- **Requires:** email-manager
- **Stack:** Rust (axum), MongoDB

## Stuff8 domain domains

Stuff8 — the personal inventory → marketplace estate — composes its own domain domains on top of the reusable ones. These demonstrate how a product expresses its specific model through Eco.

### inventory

Personal inventory and asset management. The source of truth for an item's photos, categories, and value. "Inventory first" — the marketplace is only a view of it.

- **Requires:** auth, photos
- **Stack:** Rust, MongoDB

### marketplace

Public search and listing projection. A filtered view (`sellable = true`) over inventory — never a duplicate. Listings appear here with one click from the inventory.

- **Requires:** auth, inventory, photos, notifications
- **Stack:** Rust, MongoDB

### bidding

Offers, buyer selection, and negotiation. Buyers submit offers; owners accept, reject, or negotiate in realtime. Connects the marketplace to the eventual transaction.

- **Requires:** auth, inventory, notifications
- **Stack:** Rust, MongoDB

### profile

User profile: bio, experience, education, skills, certifications, social links. Split out of the legacy monolith as an independent Eco-managed domain.

- **Requires:** auth
- **Stack:** Rust, MongoDB

## Composition apps

- **stuff8_core** — the Stuff8 estate core repo: owns `ecompose.yml` + the Astro.js + Tailwind CSS frontend, composing the domains above into one user experience
- **eco_docs_composition** — this documentation site (VitePress)

## The catalog grows

The catalog is an ecosystem, not a fixed list. Every reusable domain added — like `rag` — makes future estates cheaper. New projects compose stable, veteran-designed domains plus whatever logic is genuinely unique to the project.

See also: [Domains](/concepts/domains), [Composition](/concepts/composition), [The end-to-end model](/why/end-to-end).
