# Introducing LXS: Linux Services

> *"Code is cheap. Show me your PaaS."*
> — a friendly nod to Linus Torvalds

**Ecosphere is a platform of reusable Linux Services (LXS).** A service is a
single compiled binary — a Rust or Go executable — that runs natively on a
Proxmox CT, owns one bounded domain, and exposes a contract. Developers compose
these services like building blocks into production estates. They build their
core domain, pick the supporting domains they need, and ship.

This page is the story of why that exists, and the journey that led here.

---

## The journey: where this came from

### The 128 GB mini PC that refused to break

The stress-test estate ran on a **128 GB, $300 mini PC** — the same hardware
Ecosphere runs in production, sharing CPU, memory, and disk with four other
production estates. It sustained **5,000 concurrent virtual users**. The
hardware was never the bottleneck. The *build pipeline* was.

### The wrong idea: one dedicated Rust-build CT

Early on, the design assumed Rust had to be **built on the server**. To avoid
installing a toolchain on every application CT, a single CT was dedicated as
"the Rust builder" — one shared machine that compiled everyone's services.

It was the wrong idea, and it failed loudly: **five estates tried to build at
once, and the whole system went down.** A shared builder is a single point of
contention. Compilation is heavy; concentrating it on one box guarantees a
crash under parallel load. That concept existed because the platform was
originally polyglot — Java, Node, Python all needed a fat build environment on
the server, so a shared builder felt natural.

### The insight: it's all Rust now — so build on the developer's machine

The estates are **100% Rust**. Rust does not need a server-side build farm.
It compiles on the developer's own PC or Mac:

> If a million users each run their own build on their own machine, that is a
> million parallel compilers that cost the platform nothing.

The flow is now:

1. The developer keeps the source on **their machine**.
2. Eco cross-compiles their services for Linux (`x86_64-unknown-linux-musl`)
   — a static binary, no glibc matching, no runtime.
3. The binary is shipped to the Ecosphere server and run there.

**rustc never needs to exist on a CT.** A CT becomes purely a host for running
binaries — exactly the "Linux Services" model.

---

## The mechanism: the Ecosphere agent

Shipping a binary to a server requires authorization and bookkeeping. That is
what the **Ecosphere agent** (the `eco serve` server on the Proxmox host)
provides, and it is the seam where the product begins:

- Every developer gets an **API key**.
- With a key, `eco up --remote` cross-compiles on their machine and ships the
  binaries to the agent, which installs them on the target CT and runs the
  estate deploy — **without compiling Rust on the server**.
- API keys are per-developer or per-account. That is the natural place to put
  **pricing**: usage, estate size, and access to premium LXS are all billable.

So the economics invert. Building is free for the platform (it happens on
developer hardware). The platform charges for what it *provides*: the running
service, the domain catalog, the automation — the PaaS, not the code.

---

## LXS: Linux Services

An LXS is the atomic unit of Ecosphere. It is:

- a **single compiled binary** (Rust or Go)
- **one bounded domain** — auth, photos, notifications, email, payments,
  shipping, chat…
- a **declared contract** — its API, its runtime, its ownership
- **self-sufficient** — it does not need a language runtime, a framework, or a
  build step on the host

Because a binary is self-contained, an LXS can be **moved, sold, and composed**
the way no interpreted or JVM application ever could.

This returns to the original vision of Ecosphere: **a collection of Linux
Services that anyone can reuse and recompose into solutions.** Not a monolith,
not a container fleet — an ecology of small, independent, living services.

---

## The LXS marketplace

LXS form the foundation of a **service marketplace**.

A developer building a marketplace application does not rebuild the world:

| Supporting domain | Ready as an LXS |
| --- | --- |
| Authentication | ✅ auth — login, registration, JWT, email verification |
| Images & uploads | ✅ photos — storage, thumbnails, video re-encoding |
| Notifications | ✅ notifications — in-app, email, push |
| Email | ✅ email-manager — transactional, templates |
| Payments / shipping | ✅ payments, shipping — compose in |
| Search / RAG | ✅ rag — vector search over your content |

The developer writes **only their core domain** — the part that makes their
product unique. Everything else is already built, tested, and running.

Crucially, a service built once can be sold. **Because a Rust or Go LXS is an
independent binary, domains can be traded on the marketplace.** The same is not
true of Java, Laravel, or Python services — they ship with a huge runtime
environment and cannot be cleanly packaged or priced as a unit.

---

## Why Rust (and Go)

Two properties make this model possible:

1. **A static binary** — compile once, run anywhere Linux runs. No runtime to
   provision, no dependencies to install, no version drift.
2. **Predictable, tiny footprint** — a single service uses ~1–5 MB and starts
   in milliseconds, so many LXS share one CT comfortably.

Rust and Go are the only mainstream languages in Ecosphere's set that produce
independent binaries. This is not a minor implementation detail — it is the
property that turns a codebase into a **product**.

See [Why Rust & Go?](/ecosphere/why-rust-and-go) for the full argument.

---

## The decoupling

Ecosphere decouples software production into four layers:

```
source code  →  binary  →  LXS  →  the world
```

An LXS behaves like an **independent individual** — built once, moves on its
own, and composes with others into solutions. The composition is the value; the
binary is the unit; the source is just the starting point.

---

## What this means for cost

The combination is dramatic:

- A developer with a **free, cheap AI model** (OpenCode + DeepSeek-class) can
  produce a **production-quality application**, because the supporting domains
  and their contracts already exist. The AI only has to do the *plumbing*.
- Those supporting domains can themselves have been built once with the most
  **expensive frontier models** — the cost is paid once, by the domain author,
  and amortized across every estate that composes them.
- **A Zen-level budget ends up with an Opus-level result**, because the hard,
  expensive 20% (auth, storage, notifications, payments) is already done. The
  remaining 80% is assembly.

Development cost collapses. The platform makes the remaining work — the core
domain, the composition, the operations — as cheap as possible.

---

## What you can do right now

- Run your estate **locally, for free**, and expose it at
  `your-name.getecosphere.com` with `eco up dev` + `eco serve`.
- Compose **versioned LXS** from the [LXS Registry](/ecosphere/lxs-registry) —
  auth, notifications, photos, email-manager, profile, chat — instead of
  building them. `eco up --remote` ships the verified binary; no compiler on the CT.
- Use the free tier of ready LXS; upgrade for enterprise domains and capacity.
- Publish your own LXS to the registry and let others compose it.
- Follow the tutorial to see how far a free budget goes:
  [three production apps with nothing but OpenCode Zen](/ecosphere/tutorial-open-code-zen).

See also: [The LXS Registry](/ecosphere/lxs-registry), [Why Rust & Go?](/ecosphere/why-rust-and-go), [The eco CLI: Node → Rust](/case-study/eco-cli-node-to-rust), [Stress testing at scale](/case-study/stress-test).
