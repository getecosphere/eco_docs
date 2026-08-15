# The eco CLI: Node → Rust

**The `eco` command itself ran on Node.js for its entire life — until the day we shipped it as a single compiled Rust binary. This is the story of why the CLI — the one tool that provisions everything else — was the *last* thing to become Rust, and why that ordering was deliberate. And it is the story of what shipping a CLI as a Node package really costs: `node_modules`, and everything that comes with it.**

---

## The plot twist: the orchestrator was the last to be rewritten

Eco's estates are overwhelmingly Rust. Auth, photos, inventory, marketplace, bidding, chat, profile, rag, email-manager, contact-form — all compiled, tiny, native binaries that start in milliseconds and sleep in single-digit megabytes.

But the tool that *composed, provisioned, and deployed* all of those Rust services was itself a **Node.js CLI**.

That seems backwards. If Rust is Eco's cheapest runtime, why did the most important command in the system run on the most expensive runtime Eco knows how to provision?

The answer is the ordering was intentional, and it is exactly the ordering this page recommends:

1. **Domains first** — prove that Rust services composed into estates actually work, under real load, before betting the control plane on it.
2. **Then the CLI** — once the workflow is stable, port the orchestrator so *everything* in the pipeline is native.

Eco's own [Why Rust](/why/why-rust) page said it plainly for a long time:

> "Node for the browser and CLI tooling, Rust for the services that run 24/7 on the CT."

That rule made sense while the CLI was just a thin dispatcher over proven Bash scripts. It stopped making sense the moment we looked at what shipping a Node CLI actually costs.

---

## Why the `eco` command matters

`eco` is not a convenience. It is the **control plane** of every estate:

- `eco up --remote` cross-compiles + ships to the `eco serve` agent, which provisions the CT, installs artifacts, generates `.env`, and starts services — in one command
- `eco configure` regenerates every service's environment and PM2/systemd config from `ecompose.yml`
- `eco startproject` scaffolds an entire estate from reusable domains and pushes the estate repository to GitHub
- `eco expose` wires the Cloudflare tunnel and DNS record
- `eco sync` streams production databases down to a dev machine
- `eco prox` manages CTs, tunnels, and archives

When this command runs, it is **on the Proxmox host and inside every CT**. It is what a remote deploy launches to update a production estate. It is the tool an operator reaches for during an incident. It is, in other words, an always-on piece of production infrastructure — which is precisely the thing Eco's own philosophy says should be a small native binary, not a Node package.

> If a domain service had the same availability profile as the CLI — started by every deploy, present on every machine, part of every incident — we would never have allowed it to be a Node package. The CLI was a 100 MB Node application running on every CT for years, and we only noticed because we finally asked the question.

---

## The real problem: npm, `node_modules`, and a 100 MB `eco`

A Node CLI is not "a script." A real one is a package — with a dependency tree. Eco's CLI pulled in `sql.js` (a full SQLite port compiled to WebAssembly) for the resource registry, plus the transitive tree that any non-trivial npm package accumulates.

### What shipping a Node CLI actually means

- **`node_modules/`** — the CLI could not run from a compiled artifact. It shipped as a directory tree of thousands of package files. Every CT that ran `eco up` first had to materialize that tree.
- **`npm install` on every CT** — because `node_modules` is never committed, each deploy ran `npm install && npm link` inside the CT. That is network I/O, disk writes, and a few seconds of wall-clock on every single provisioning run.
- **`npm link`** — a global symlink dance so the `eco` binary resolved on `PATH`. Fragile across environments, and it must be redone after every update.
- **A Node.js runtime dependency** — the CLI required Node to be present and correct on the Proxmox host *and* inside every CT. Provisioning Node is a service Eco understands — but the control plane should not *depend* on the thing it provisions.
- **~100 MB+ installed** — the interpreter, the standard library, and the dependency tree. For a tool whose entire job is to keep estates small.
- **WASM SQLite** — the registry used `sql.js`, a SQLite compiled to WebAssembly so it could run *inside* Node. It worked, but it was a compatibility layer on top of a runtime that was itself already a compatibility layer.

The absurdity is easy to state: **Eco's CLI was the single largest thing Eco deployed to a CT that was not an application**, and it was a Node package whose whole purpose was to keep applications small.

### The pain you feel on every deploy

Back when deploys were webhook-triggered, a deploy's `redeploy.sh` did:

```bash
cd /opt/projects/eco
npm install      # fetch the whole dependency tree, again
npm link         # re-link the global binary
```

Every push. Every estate. Every CT. That is the "Node tax" on the control plane: not a one-time cost, but a cost paid on **every deploy, forever**.

---

## The migration: everything compiled into one binary

The port took the entire CLI — every command, every helper — and rebuilt it in Rust, then **embedded every bundled asset inside the binary itself**.

### The embedded payload

A Node CLI carries its assets as files on disk next to the script. The Rust binary carries them *inside* the executable, via `include_str!` / `include_bytes!`:

- `configure.sh` — the estate configurator (3,600+ lines)
- `provision.sh` — the runtime provisioner (1,100+ lines)
- `git.sh`, `tree.sh`, `install-*.sh` — the workflow scripts
- `assets/ecology-mark.webp` — the starter image used by `eco startproject`

On first run the binary materializes those scripts to a cache directory (`~/.cache/eco/bundled/`) and executes them through `bash`, preserving the exact behavior the Node version had. The scripts never change on disk; they ship inside the executable.

### One Node process became an internal command

- `src/bin/registry-cli.js` → **`eco registry`** — the port/database allocation backend, now rusqlite (a real native SQLite) with AES-256-GCM secret encryption

The other Node process — `src/runtime/github-webhook-receiver.js` — was the
GitHub deploy receiver. It did **not** survive the migration as a shipped
subcommand: the webhook-triggered deploy model was retired entirely once the
build moved to developer machines (`eco up --remote`), so the receiver was
removed rather than ported.

### The result

```text
BEFORE  eco = a directory tree + Node.js + node_modules + npm install + npm link
AFTER   eco = ONE compiled binary (rust/target/release/eco)
```

| | Before (Node CLI) | After (Rust binary) |
|---|---|---|
| Artifact | directory tree + `node_modules/` | single ~6 MB binary |
| Runtime needed | Node.js on host + every CT | none |
| Install on CT | `npm install && npm link` | copy one file |
| Registry | sql.js (WASM SQLite inside Node) | native rusqlite |
| Webhook receiver | separate Node HTTP process | removed (webhook deploys retired) |
| Bundled scripts | files on disk | embedded, extracted on first run |
| Deploy tax | `npm install` on every push | none |

---

## Parity: the same behavior, verified

"Everything must still work the same" was the hard requirement, so the port was verified command-by-command against the Node CLI:

- **42 parity tests** comparing Rust output byte-for-byte against the Node CLI
- Covered `help`, `show`, `ports`, `repos`, `db`, `dashboard`, `compose add`, and dry-runs of `up`, `expose`, `sync`, `stress`, `provision`, `rust cleartarget`, `clearstarterproject`
- Tested against **three real estates** (eco_docs, stuff8, chronic)
- The SQLite registry and AES-GCM-encrypted database secrets **interoperate in both directions** — a registry written by the Node CLI is read correctly by the Rust binary and vice versa

---

## What was gained

- **No Node.js dependency** on the Proxmox host or any CT for the control plane
- **No `npm install` on deploy** — the deploy tax is gone
- **One artifact** — a single binary you can copy anywhere, on any machine, and it just works
- **Smaller footprint** — a ~6 MB static binary replaces a ~100 MB+ Node installation
- **Faster, deterministic startup** — a native binary boots instantly with no interpreter, no module resolution, no `require()` graph
- **A native registry** — rusqlite instead of SQLite-through-WebAssembly-inside-Node

---

## Why the CLI was the right "last" thing to port

There is a lesson in the ordering, and it is not "Rust everywhere immediately."

1. **Prove the model with domains first.** The estate services were rewritten to Rust first, measured in production, and shown to be dramatically cheaper to run ([stress test](/case-study/stress-test), [Java → Rust](/case-study/java-to-rust-migration), [Go → Rust](/case-study/go-to-rust)). Only then was the CLI ported.
2. **The CLI is the riskiest thing to change.** It is the tool you use to recover. If `eco up` is broken, nothing gets deployed. Porting it last meant the workflow around it had stabilized, so the port was a faithful translation of a known-good behavior, verified against the original.
3. **The payoff compounds.** Once every *service* was Rust, the CLI was the last Node island. Porting it removed the final runtime dependency from the entire pipeline — from the Proxmox host down to the last CT.

Now the whole chain is native:

```text
eco (Rust binary)
  └── provision.sh / configure.sh / git.sh (embedded in the binary)
        └── domains (Rust binaries)
              └── Proxmox CT (native processes)
```

No interpreter anywhere in the chain. The orchestrator and the orchestrated are finally the same kind of thing.

---

## Would we do it again

Yes — and if we were starting over, we would still port the CLI *after* the domains, but we would budget for it as a first-class workstream rather than a trailing chore. The Node island (CLI + the deploy receiver that was later retired with webhook deploys) was the last place where Eco shipped something that did not match its own philosophy of "smallest runtime that does the job." Now it does.

See: [Why Eco promotes Rust](/why/why-rust), [The story behind Eco](/why/story), [Architecture](/reference/architecture).
