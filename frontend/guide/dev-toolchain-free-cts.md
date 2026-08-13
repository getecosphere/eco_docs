# Dev-toolchain-free CTs

> Build once on the machine that owns the work. Ship the artifact. The CT never
> compiles anything.

Eco's production CTs are **toolchain-free**: they only *run* artifacts — Rust
binaries and built frontends. All compilation happens on the developer's
machine (or a tiny Linux VM on it), and `eco up --remote` ships the artifacts
over the `eco serve` agent. There is no Node.js, no npm, no cargo, no PM2 on a
production CT.

## Why this matters

CTs used to be build machines too. Every deploy meant:

- `cargo build --release` (or a shared builder CT for it), and
- `npm ci` + `npm run build` for every frontend, and
- gigabytes of `node_modules`, npm cache, build caches, and PM2 logs piling up
  on each CT.

That was contention (a shared builder CT straining under parallel `eco up`
runs), disk bloat, slow deploys, and a production environment that carried an
entire dev toolchain.

## The model

```
developer machine                 Proxmox host                     production CT
──────────────────                ───────────────                   ──────────────
eco up --remote ──► cross-compile ──► eco serve agent ──► installs ──► runs only
     │  Rust → x86_64 musl binary      │   source + artifacts           │  systemd unit
     └── Node → npm ci + build → dist / bundle ────────────────────────►  serves dist / binary
```

- **Rust** is cross-compiled for `x86_64-unknown-linux-musl` — a static
  binary, no glibc matching, no runtime deps.
- **Node** is *built* on the same machine: `npm ci` + `vite build`/`astro
  build`. What ships is the artifact (`dist/`, an esbuild bundle, or Next's
  `standalone` output) — not `node_modules`.
- The CT installs the artifacts and runs them under **systemd**. No build
  toolchain, no Node runtime, no process-manager daemon.

Builds happen on the machine that owns the work; the CT is a pure runtime.

## The builder: an old Mac tells the story

The reference builder is a **2014 Intel MacBook Pro** (i7-4770HQ, 8 threads,
16 GB RAM) running **macOS 12 Monterey** — the same machine Eco's story is
built around. It runs a single Multipass **Ubuntu 22.04 VM** (`eco-builder`,
4 vCPU / 6 GB RAM / sparse 40 GB disk).

The Mac is so old that it is *also* a compatibility tale: OrbStack needs macOS
14, modern Multipass needs macOS 13.3+, and Lima's VZ driver needs macOS 13.
The only runtime that works on this machine is **QEMU-based Multipass 1.13.1**
(minimum macOS 11) — so that is what the builder uses. What the ecosystem
couldn't run, it needed least: a humble Ubuntu VM and two toolchains.

Inside the VM:

```
Ubuntu 22.04 (x86_64)            # arch-identical to production CTs
Node.js 22 LTS + pnpm             # frontend builds → correct linux-x64 native modules
Rust stable + musl target + zig   # rust cross-compiles / LXS packages
build-essential, make, python3    # node-gyp native addons
```

Being **x86_64**, the VM produces artifacts that are architecture-identical to
the Proxmox CTs — so even npm's native modules (esbuild, sharp, rollup) come
out deployable. An M1 dev machine uses the same scripts; Rust cross-compiles
directly, and amd64 Node native modules are built via the (Rosetta/emulated)
Linux environment.

## What it costs vs what it saves

Measured on the reference machine and the live estate CTs:

**Dev-side cost of the builder** (per developer machine):

| | Size |
|---|---|
| Ubuntu 22.04 VM + toolchain (Node 22, pnpm, Rust, zig, build tools) | ~4–4.6 GB in-VM |
| Sparse disk on the host (only written blocks) | ~4 GB |
| Memory allocated to the VM (idle ~180 MB, builds burst to configured 6 GB) | 6 GB cap |

**CT-side footprint removed** (measured before cleanup):

| | CT 101 (prod: stuff8 + assessment + getecosphere + crm + apindo + ecosphere + eco_docs) | CT 1000 (staging) |
|---|---|---|
| Node runtime (`node`/`npm`/`npx`/`pm2`) | 95 MB | 95 MB |
| Global npm libs | 40 MB | 40 MB |
| npm cache | 872 MB | 469 MB |
| PM2 state + logs | **2.3 GB** | 17 MB |
| Project `node_modules` | ~2.1 GB | ~711 MB |
| Frontend build caches | ~50 MB | ~1.5 MB |
| **Disk freed** | **≈ 5.5 GB** | **≈ 1.3 GB** |
| **Live Node/PM2 RAM freed** | **≈ 889 MB** | small |

**Total: ≈ 6.8 GB of disk and ≈ 0.9 GB of RAM removed from production CTs** —
replaced by a ~4 GB Linux VM on the developer's desk. The CTs are no longer
build machines: no `npm ci`, no `vite build`, no compile-time CPU spikes, no
shared-builder contention. A deploy becomes "install artifact + restart
unit", and PM2 (itself a Node program) is gone — services run as plain
systemd units with journald logs, cgroup resource limits, and health
watchdogs.

## What you save in time

Measured on the reference machine + the live staging estate:

| | Before (build on the CT) | After (build on the dev builder) |
|---|---|---|
| Frontend build (`npm ci` + `vite`/`astro build`) | every deploy, on every CT, ~1–3 min of CT CPU + disk churn | **once** on the builder (~26 s warm, a couple of minutes cold), then **hash-skipped forever** |
| CT-side `npm run build` step | ran every deploy | **removed** — the shipped `dist` is served as-is |
| Rust cross-compile | in-CT (or shared builder contention) | dev machine, cached: ~0.5–1.6 s per unchanged service |
| Repeat deploy, frontend part | re-downloads + re-builds node_modules on the CT | `sync` + hash-skip → no build; the CT only installs the *runtime* deps for the preview server |

The `.eco-frontend-hash` skip means a frontend whose source didn't change is
synced and skipped in seconds. The remaining CT-side time today is `npm ci`
for the preview runtime — that disappears entirely in Phase 4 (static serving,
no Node on the CT at all).

## Node backends as single binaries (Bun)

Node doesn't ship as a single binary by default — it ships an environment.
But **Bun can compile a Node app (and its imports) into one static executable**
with the Bun runtime bundled:

```bash
bun build --compile --target=bun-linux-x64 ./build/index.js --outfile app-server
```

Measured on the assessment SSR frontend (SvelteKit adapter-node), deployed to a
CT:

| | size | needs node_modules on the CT? |
|---|---|---|
| Bun-compiled single binary | **91 MB** | **no** — run it, it serves |
| Dev `node_modules` | 275 MB | yes, plus a Node runtime |

The 91 MB binary ran on the linux-x64 CT with no `npm ci` and served HTTP 200.
This gives Node backends the same "single static artifact, CT runs it" story as
Rust — and it cross-compiles to `bun-linux-x64` from any host (including the
arm64 M1). Caveat: SSR servers that read sibling asset files (adapter-node's
`client/`/`server/`) still need those assets shipped alongside the binary
(no node_modules though); pure backend APIs bundle everything in the one file.

## Status

- [x] Local builder provisioned (Multipass Ubuntu 22.04, x86_64) — Intel + M1
      provisioning scripts
- [x] `eco up --remote` builds Node artifacts (dist/bundle) on the builder
- [x] `.eco-frontend-hash` skip, mirroring `.eco-rust-hash`
- [x] Validate on **stuff8** and **assessment** estates (both deployed to
      staging, frontends serving HTTP 200)
- [ ] systemd service generation in `configure.sh` (replaces PM2)
- [ ] Purge node/npm/pm2 from CT 101 + CT 1000

> Honest caveat until Phase 3–4 land: frontends are *built* off-CT and their
> `dist` ships to the CT, but the CT still runs the preview runtime (`vite
> preview`, which is Node) until the systemd + static-serving migration and the
> node purge are done. The "no Node on a production CT" claim below is the
> end-state; today the CT keeps Node solely to *serve* the shipped dist.

## Live validation (stuff8 + assessment on staging CT 1000)

Both estates deployed end-to-end with `eco up --remote --staging`:

```
assessment  core (Rust musl) + frontend (SvelteKit, built on the local builder)
            + auth@1.0.2, email-manager@1.0.1, storage@1.0.5, profile@1.0.2 (LXS)
stuff8      inventory/marketplace/bidding (Rust musl) + frontend (Astro, built
            on the local builder) + auth/chat/email-manager/storage/profile/
            notifications (LXS, bumped to the docs versions)
```

Both frontends serve HTTP 200 with the dist that was built on the developer's
Linux VM and shipped through the agent — no in-CT frontend build.

### Field notes (things that will bite you again)

- **Swapping `/usr/local/bin/eco` on the host does NOT update the running
  `eco serve` agent.** The agent is a long-lived process; it keeps the old
  binary in memory. After any binary swap, restart it
  (`systemctl restart eco-serve` or `pkill -f 'eco serve'` + relaunch).
- **`bash -lc` (login shell) corrupts exit codes on the builder's Ubuntu
  image:** `set -e; exit 0` reports exit 1 because login shells source
  `~/.profile`/`~/.bashrc`. Every builder command must use non-login
  `bash -c`.
- **Estate-core path prefixes must be stripped on the flattened host layout.**
  A service at `stuff8_core/frontend` lands at `/opt/projects/stuff8/frontend`
  on the CT; resolve it via the estate-core repo name (from `composition.git`),
  or npm install/build run in a directory that doesn't exist.
- **Some `package-lock.json` files are missing the platform-specific optional
  deps** (e.g. `@esbuild/linux-x64`), so `npm ci` fails on Linux. The builder
  and the CT fall back to `npm install`, which resolves them.
- **Redeploying over an existing estate hits a port-registry conflict** on the
  target CT (ports are allocated per hostname and persist). Reset with
  `eco ports reset --project <name>` on that CT before redeploying a
  materially different service set.

This is the direction Eco was always headed: **Docker gives you images and
removes the toolchain from the host. Eco gives you artifacts and removes the
toolchain from the CT.** The developer's old Mac, of all machines, is what made
that real.
