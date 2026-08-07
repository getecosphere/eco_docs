# Why Eco promotes Rust

Eco favors Rust as the language for backend domains. Not because it is the easiest to write, but because it is the **cheapest to run** — and in Eco's philosophy, run cost is the cost that actually matters.

## The argument in one line

Rust is the **smallest** supported runtime, and in the world of AI the old objection to it — the steep learning curve — simply no longer exists.

## Smallest footprint

An Eco estate runs many domains on one Proxmox CT. Each backend is a service on shared hardware, so **memory and CPU per service directly cap how many services an estate can host**. Compare the runtimes Eco provisions:

| Runtime | Typical footprint | Startup | Binary / image size |
| --- | --- | --- | --- |
| **Rust** | tiny — a compiled static binary | milliseconds | ~1–5 MB binary, zero runtime |
| Go | small — static-ish binary | milliseconds | ~10–20 MB binary, zero runtime |
| Node.js | moderate — interpreter + libs | tens of ms | ~100 MB+ with dependencies |
| Java 17 | heavy — JVM, heap, class loading | seconds | ~250 MB+ JRE + app |

Rust and Go are both lean, but Eco's estates already lean on Rust for the majority of domains (auth, photos, inventory, marketplace, bidding, chat, profile, rag, email-manager, contact-form) because of one more property: **predictable memory**. A single Rust binary with no garbage collector and no interpreter behaves predictably under load, which matters when a CT runs ten services at once.

## The learning-curve objection is obsolete

The classic case against Rust was:

> Rust is hard to learn — ownership, lifetimes, borrow checker. Only experienced systems programmers can be productive.

That was true when the only way to write Rust was to write every borrow and lifetime yourself. In the world of AI-assisted development it is no longer true:

- an AI model writes idiomatic Rust with correct ownership and error handling
- the compiler itself is a relentless, precise reviewer — it *tells* you the fix
- the developer's job becomes *directing and reviewing*, not remembering syntax
- Eco's domain contracts (see [The end-to-end model](/why/end-to-end)) hand the AI the boundary: what the domain owns, its API, its runtime

So the historical trade-off — *"Rust is smallest but hardest"* — collapses into *"Rust is smallest, and AI removes the difficulty"*.

**Why not Rust?**

## Head-to-head with the languages Eco uses

### Rust vs Go

Both compile to small native binaries. Eco uses Go for one domain today (`notifications` — a connection-heavy WebSocket hub) and Rust for most others.

| Concern | Rust | Go |
| --- | --- | --- |
| Memory use | lower — no GC | low, but GC pauses exist |
| Startup time | fastest | fast |
| Concurrency | async + threads | goroutines (very ergonomic) |
| Ecosystem maturity | huge | huge |
| Learning curve | steep without AI | gentle |
| Binary size | smallest | slightly larger |
| AI productivity | excellent | excellent |
| Suitability | systems + services | services, especially I/O-bound hubs |

Eco's stance: Go remains a great choice for lean, connection-heavy services. Rust wins when you want the absolute smallest, most predictable runtime for a service that will be composed into many estates.

### Rust vs Node.js

Node powers Eco's frontends and the Eco CLI itself. Backends in Node are a different story.

| Concern | Rust | Node.js |
| --- | --- | --- |
| Footprint | tiny | ~100 MB+ per service |
| Memory safety | guaranteed at compile time | developer discipline |
| Throughput | very high | high for I/O, weaker for CPU |
| Developer iteration | fast (incremental compile) | instant (no compile) |
| Type safety | strong, exhaustive | moderate (TypeScript helps) |
| Ecosystem | large | largest |
| Best for | backends, compute, infrastructure | frontends, tooling, scripting |

Eco's rule of thumb: Node for the browser and CLI tooling, Rust for the services that run 24/7 on the CT.

### Rust vs Java

Eco inherited Java services from its legacy monolith — and is steadily rewriting them in Rust. The numbers from real production testing make the case undeniable.

**August 2026 stress test — same hardware, same CT, same load generator, two production estates:**

| Metric | Stuff8 (Rust) | Legacy Java Application | Advantage |
|---|---|---|---|
| Avg latency at 1,000 VUs | **288ms** | 403ms | Rust 29% faster |
| Avg latency at 3,000 VUs | **959ms** | 1,204ms | Rust 20% faster |
| Avg latency at 5,000 VUs | **1,601ms** | 2,005ms | Rust 20% faster |
| Max throughput | **2,767 req/s** | 1,982 req/s | Rust 40% higher |
| Max bandwidth | **45.8 MB/s** | 32.8 MB/s | Rust 40% higher |
| Per-service memory (idle) | **4–13 MB** | 225–359 MB | Rust 20–90x smaller |
| Startup time | **<100ms** | 13–22 seconds | Rust 130–220x faster |
| Services in the estate | 10 domains | 6 domains | — |
| Failures at 5,000 VUs | **0%** | 0.2% | Both stable |

These are not synthetic benchmarks. Both estates run on the same Intel i3-1220P mini PC (7.3 GiB RAM) under Proxmox, sharing CT 101 with three other production estates. The Rust estate (Stuff8) has **ten independent domains**; the Java application has six. Stuff8's ten Rust backends consume ~70 MB total. The Java application's two Spring Boot services alone consume ~584 MB.

| Concern | Rust | Java 17 |
| --- | --- | --- |
| Footprint | tiny binary | JVM + heap (hundreds of MB) |
| Startup | milliseconds | seconds |
| Memory behavior | deterministic | GC pauses |
| Build tooling | cargo | Maven/Gradle |
| Boilerplate | minimal | verbose (getters, config) |
| Learning curve | steep without AI | gentle |
| AI productivity | excellent | excellent |
| **Observed throughput advantage** | **+40%** | baseline |
| **Observed memory advantage** | **20–90x smaller** | baseline |

Java's cost problem is the reason Eco exists at all in one sense: the old Spring Boot auth service was a heavyweight general-purpose stack for what should be the lightest, most reusable domain in the estate. Rewriting it in Rust corrected both the cost and the domain boundary.

> **The 514 MB gap.** On a mini PC running five estates simultaneously, the Java application's two Spring Boot services alone consume 584 MB. Stuff8's ten Rust services consume 70 MB. That 514 MB difference is more than the entire memory allocation of a typical small CT. Rust does not just run faster — it **makes room** for more domains, more estates, more customers, on the same hardware.

See the [full stress testing report](/case-study/stress-test) for methodology, raw data, and the Cloudflare tunnel optimization that enabled these results.

### Rust vs Python

Python is used in Eco estates for build-time tooling and asset scripts.

| Concern | Rust | Python |
| --- | --- | --- |
| Footprint | tiny binary | interpreter + site-packages |
| Startup | milliseconds | tens of ms (slower at first import) |
| Performance | fastest | slowest of the set |
| Ease | harder without AI | easiest |
| Best for | services, compute | glue, scripting, data tooling |

Python's ease of writing makes it a fine choice for one-off scripts in an estate's bootstrap. It is not a good fit for always-on estate services.

## The honest cons of Rust

Eco doesn't pretend Rust is perfect:

- **Compile times** are longer than Go's, and longer than any interpreted language. Incremental builds help; large estates build once per CT and reuse binaries.
- **Steeper abstractions** — async, traits, lifetimes. Without AI assistance the ramp is real.
- **Verbose for some tasks** — serialization and boilerplate take more lines than Go or Python.
- **Talent pool** — fewer Rust developers than JS/Python/Java, though AI narrows this.

Each of these is a one-time or tooling cost, not a per-service running cost. Eco optimizes for the cost you pay **forever** — the footprint on the CT — rather than the cost you pay **once** — learning the language.

## The verdict

> Rust is smallest. AI removed the learning curve. So why not Rust?

For always-on estate backends, Eco's answer is Rust by default, with Go where a connection-heavy service is a better fit, Node for everything browser-side, and Python for tooling. The language is a domain decision — but Eco nudges toward the smallest runtime that does the job.

See also: [Supported languages](/guide/languages), [The end-to-end model](/why/end-to-end), [Architecture](/reference/architecture).
