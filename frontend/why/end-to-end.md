# The end-to-end model

eco is an **end-to-end solution** — for organizations, individuals, small teams, and large teams — to manage complexity and produce high-quality code guided by their own principles in the world of AI.

The key idea is simple: **the supporting domains are done already.**

## Any new staff can just join and produce

In a traditional project, a new engineer spends their first months learning the hidden knowledge of the codebase — where the auth lives, how storage works, which service owns what, how to deploy, which ports, which secrets.

With eco, that knowledge is **captured in the domain contracts**. A new staff member — even one brand new to the product — joins and can produce a working feature immediately, because:

- the **auth** domain already owns login, sessions, and JWTs
- the **photos** domain already owns uploads and media storage
- the **notifications** domain already owns in-app + realtime push
- the **estate** already knows how to wire, expose, and deploy everything

The new developer composes and builds on the contract. They don't need to rebuild the foundation.

## The RAG example: a supporting domain, added in minutes

Here is a concrete, real example. The **RAG domain** was added as a reusable support domain to an existing, already-large estate (Stuff8). RAG — Retrieval-Augmented Generation — answers questions about an estate by grounding DeepSeek on the estate's own docs and code.

Adding it meant:

1. **Clone it** — `eco compose add rag` from the estate root
2. **Declare it** — one line in `ecompose.yml`:
   ```yaml
   domains:
     - rag
   ```
   plus one service block:
   ```yaml
   services:
     rag-backend:
       path: rag/backend
       runtimes:
         - rust
         - mongodb@7
   ```
3. **Run it** — `eco up`

eco then does the rest:

- builds the Rust service (axum + fastembed/ONNX embeddings + DeepSeek client)
- wires `.env` with `MONGODB_URI` and `DEEPSEEK_API_KEY`
- routes `/api/rag/*` through the estate gateway
- exposes the service URL to consuming frontends (`PUBLIC_RAG_URL=`)
- restarts the service under PM2

The domain owned its whole lifecycle — ingestion, chunking, embedding, retrieval, chat — and the estate absorbed it without touching a single existing service. **That is what a supporting domain means in eco: pluggable capability, not a rewrite.**

## Newbie and veteran produce the same result

This is the deep consequence. A newbie in "vibecoding" — building by prompting AI — can produce the same result as a veteran professional.

Not because the newbie knows the domain in detail. **Because the contract for how to develop that domain was written by a veteran programmer in that organization.**

The veteran decides:

- the domain boundary — what it owns and what it never touches
- the public contract — endpoints, payloads, errors
- the persistence rules — its own database, no cross-domain queries
- the runtime — which language, which runtimes, how it scales
- the integration points — how frontends and siblings consume it

The newbie inherits that contract, composes it, and ships. **The quality comes from the veteran's contract, not the newbie's experience.**

## What the organization gains

- **Onboarding drops from months to days** — the contract is the documentation
- **Quality is baked in, not hoped for** — every domain carries the organization's principles
- **AI becomes an amplifier** — an agent prompt that says "compose `rag`, wire `chat`, ship it" is safe because the hard decisions are already encoded
- **Complexity is managed, not feared** — domains hide their internals; estates expose a stable surface
- **Effort compounds** — every reusable domain added makes the *next* product cheaper

This is the difference between a project and an ecosystem: in a project, each new feature is a new adventure. In an ecosystem, each new feature plugs into a system that is already alive.

See also: [Why the name "eco"](/why/the-name), [Domains](/concepts/domains), [The Stuff8 case study](/case-study/stuff8).
