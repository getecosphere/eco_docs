# Why Rust & Go?

> The entire Ecosphere model — LXS, the marketplace, build-on-developer-machines —
> depends on one property: **a service that is an independent binary.** Rust and
> Go are the languages that provide it.

---

## The property that matters: binary independence

An LXS must be a single compiled executable that runs on any Linux CT with no
runtime, no dependencies, no build step. Both Rust and Go deliver this:

| Property | Rust | Go |
| --- | --- | --- |
| Output | Single static binary | Single static binary |
| Binary size | ~1–5 MB | ~10–20 MB |
| Startup | Milliseconds | Milliseconds |
| Runtime | None | None |
| Cross-compile | `cargo zigbuild --target x86_64-unknown-linux-musl` | `GOOS=linux GOARCH=arm64 go build` |

A compiled service is a **product**, not a codebase. It can be copied to a CT,
run, monitored, and — critically — **sold**. That is impossible with languages
that carry a runtime:

| Language | Why it cannot be an LXS |
| --- | --- |
| **Java / JVM** | Needs a JVM, heap tuning, classpath, ~250 MB+ runtime. One service, an entire runtime to babysit. |
| **Laravel / PHP** | Needs PHP-FPM, extensions, Composer dependencies, an opcache — an environment, not a service. |
| **Python** | Needs an interpreter, a virtualenv, and C-extension wheel matching — fragile across machines. |
| **Node.js** | Needs an interpreter and a `node_modules` tree; ships megabytes of packages, not a binary. |

Rust and Go are the only languages in Ecosphere's supported set whose unit of
deployment is the binary itself. That single fact enables the marketplace, the
pricing model, and the "no build farm on the server" architecture.

---

## The deeper argument for Rust

Eco favors Rust for the majority of domains because of **predictable memory**.
A single Rust binary with no garbage collector and no interpreter behaves
predictably under load — essential when one CT hosts ten services at once. The
stress test made the point concretely: Rust ran **20–40% faster** than Java on
the same hardware and used **20–90× less memory** per service.

The classic objection — *"Rust is hard"* — is obsolete in the world of
AI-assisted development. An AI model writes idiomatic Rust with correct
ownership and error handling; the compiler acts as a relentless, precise
reviewer. The developer's job is directing and reviewing, not memorizing the
borrow checker. The cost side of Rust collapsed; the run cost was always near
zero.

Read the full treatment: [Why Eco promotes Rust](/why/why-rust).

---

## Why Go is a genuine partner

Go brings the same binary independence with a gentler learning curve and
batteries-included concurrency (`goroutines`). It was Eco's production language
for over a year before the estates moved to all-Rust — and it remains a
first-class LXS language. For a WebSocket hub (notifications, chat), Go's
goroutine-per-connection model is a perfect fit.

Read the full treatment: [Why Eco considered Go (and chose Rust)](/why/why-golang).

---

## Rust *and* Go

The platform is deliberately **polyglot at the binary layer** — but only across
languages that produce binaries. An estate may run a Rust marketplace backend
next to a Go notifications hub; both are just LXS to the CT. The rule is simple:
**if it compiles to a standalone binary, it can be an LXS. If it needs a
runtime, it stays a codebase.**

This is why Ecosphere can promise: your supporting domains are done. Auth,
photos, notifications, email, payments, shipping — each is an LXS you compose,
not a service you build. And because they are binaries, each one can be bought,
sold, and reused across every estate in the platform.

See also: [Introducing LXS](/ecosphere/), [Eco vs Docker](/why/eco-vs-docker), [The end-to-end model](/why/end-to-end).
