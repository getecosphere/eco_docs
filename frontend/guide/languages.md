# Supported Languages

Eco is language-agnostic at the domain level — a domain owns its runtime and declares it in `ecompose.yml`. Eco provisions the runtime and manages the service lifecycle, no matter the language.

Below are the runtimes Eco provisions today, with the languages most commonly used across Eco estates.

## Rust — the primary backend language

<img src="/langs/rust.svg" width="48" height="48" alt="Rust logo" style="float:left;margin:0 16px 16px 0" />

Rust (with the **axum** web framework) is the workhorse of Eco estates. It powers `auth`, `photos`, `inventory`, `marketplace`, `bidding`, `chat`, `profile`, and the RAG domain. Services are compiled to native binaries, run via PM2, and are cheap to operate — a deliberate response to the heavyweight JVM services that preceded them.

Rust domains typically pair with **MongoDB**, **Redis**, and **MinIO/S3** runtimes.

## Go — for lean realtime services

<img src="/langs/go.svg" width="48" height="48" alt="Go logo" style="float:left;margin:0 16px 16px 0" />

Go powers the **notifications** domain — a persistent, realtime in-app notification service built around a per-user WebSocket hub. Go's concurrency model and small binaries make it ideal for connection-heavy services that scale horizontally.

## Node.js — the frontend runtime

<img src="/langs/nodejs.svg" width="48" height="48" alt="Node.js logo" style="float:left;margin:0 16px 16px 0" />

Node.js (v20) is the runtime for every frontend and composition app. Eco's own CLI is Node.js too. Frontends are built with modern frameworks and deployed as static or SSR apps under PM2.

## TypeScript — frontend composition

<img src="/langs/typescript.svg" width="48" height="48" alt="TypeScript logo" style="float:left;margin:0 16px 16px 0" />

TypeScript is used across the Eco frontend ecosystem — in **Nuxt.js** composition apps, **Astro.js** composition apps, **Next.js** platform apps, and the **VitePress** docs site you're reading now.

## JavaScript frameworks commonly composed

<img src="/langs/nuxt.svg" width="48" height="48" alt="Nuxt logo" style="float:left;margin:0 16px 16px 0" />
<img src="/langs/astro.svg" width="48" height="48" alt="Astro logo" style="float:left;margin:0 16px 16px 0" />
<img src="/langs/nextjs.svg" width="48" height="48" alt="Next.js logo" style="float:left;margin:0 16px 16px 0" />
<img src="/langs/tailwindcss.svg" width="48" height="48" alt="Tailwind CSS logo" style="float:left;margin:0 16px 16px 0" />

- **Nuxt.js + Vue** — supported composition frontend framework; run as a dev server (`npm run dev`) under PM2 during development and built for production with `nuxt build`. Used by the Ecosphere platform.
- **Astro.js + Tailwind CSS** — the primary frontend stack for Eco composition apps (e.g. Stuff8)
- **Next.js + React** — used for platform and legacy LMS frontends
- **Tailwind CSS** — the shared styling foundation

## Python — tooling and scripting

<img src="/langs/python.svg" width="48" height="48" alt="Python logo" style="float:left;margin:0 16px 16px 0" />

Python is used for build-time and content tooling in Eco estates — asset generation, image processing scripts, and other supporting utilities.

## Java — legacy, on the way out

<img src="/langs/java.svg" width="48" height="48" alt="Java logo" style="float:left;margin:0 16px 16px 0" />

Java (17) + Maven is a supported runtime for legacy services. The original `auth` service was Spring Boot; it has been rewritten in Rust (axum) and is now the default across every estate. **A legacy Java Spring Boot app is fully converted to Rust** — its Java backend (a Spring Boot 3.2 / Java 17 service) was ported to Rust (axum + sqlx), verified byte-identical on staging, and shipped to production on 10 Aug 2026. No Java service remains in the estate.

## Full runtime token list

`provision.sh` supports these runtime tokens in `ecompose.yml`:

| Token | Provides |
| --- | --- |
| `rust` | rustup + cargo toolchain (system-wide) |
| `golang` | Go compiler |
| `node@20` | Node.js 20 |
| `npm` | Node package manager |
| `maven` | Java build tool |
| `java@17` | JDK 17 |
| `mongodb@7` | MongoDB server + drivers |
| `postgresql@15` | PostgreSQL server |
| `redis@7` | Redis server |
| `pm2` | Process manager for all services |

## Languages are a domain decision

A domain's `CLAUDE.md` fixes its contract, including its runtime. Eco doesn't force a language on you — it provisions whatever the service declares and keeps the operational surface identical (ports, `.env`, PM2, gateway routing) regardless.

See also: [ecompose.yml reference](/reference/ecompose), [Architecture](/reference/architecture).
