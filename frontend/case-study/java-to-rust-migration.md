# Case Study — Java → Rust Migration of a Legacy Java Spring Boot App

**A full Spring Boot 3.2 / Java 17 backend, byte-for-byte verified, ported to Rust (axum + sqlx), stress-tested, and shipped to production — with the last Java process removed from the estate.**

Date: 10 Aug 2026 · Estate: a legacy Java Spring Boot app · Prod CT 101 · Staging CT 1000

---

## The starting point

A legacy Java Spring Boot app ran a **Spring Boot 3.2 / Java 17** backend alongside already-converted Rust domains (auth, email-manager, photos, profile). It was the last Java holdout in the estate — a 7,500-line Java service with 20 controllers, 107 endpoints, six scoring engines, and a PostgreSQL schema managed by 24 Flyway migrations.

| Aspect | Java (before) | Rust (after) |
|---|---|---|
| Backend | Spring Boot 3.2 / Java 17 / Maven | axum + sqlx / single static binary |
| Service memory | ~312 MB | ~11 MB |
| Service startup | 13–22 seconds | <100 ms |
| Source | ~7,500 lines Java | ~4,000 lines Rust |

---

## Why migrate

Eco's Rust domains already ran at **4–13 MB per service** vs hundreds of MB for a JVM service. The estate's Java backend was the largest remaining consumer of memory on a mini PC (7.3 GiB RAM) shared across five production estates. Converting it removed the JVM, Spring context, Hibernate, Flyway, and the entire classpath — and eliminated an entire class of crash-loop failures from stale environment handling that had historically caused thousands of PM2 restarts.

---

## The migration workflow (staging-first)

The migration used the [prod & staging workflow](/guide/prod-staging-workflow): the feature branch was deployed to the **staging footprint** (CT 1000), verified against prod, then merged to `main` for the production deploy.

```
eco git start feature/rust-conversion     # branch all estate repos
# ... write Rust backend, update ecompose.yml (java@17+maven → rust) ...
eco git push                              # push the feature branch
eco up --remote --staging                 # deploy staging (CT 1000)
# ... verify on staging ...
eco git finish feature/rust-conversion    # merge to main
eco git push
eco up --remote                           # deploy production (CT 101)
```

The conversion preserved the exact HTTP contract and the existing PostgreSQL schema:

- **All 107 endpoints** across 20 controllers (profile, schools, users, students, test categories, assignments, assignment summaries, dashboard, psikolog, fees, certificates, credentials, and the five exam flows disc/holland/papi/cfit/ist, plus big5).
- **Scoring logic ported exactly**: the 40-rule DISC classifier with its conversion tables, Holland RIASEC ranking, PAPI trait counting + band interpretation, CFIT all-or-nothing subtest-2 + IQ bands, IST raw/norm/Wert + IQ bands, and the Big Five OCEAN item bank.
- **Byte-identical JSON**: Java's `LocalDateTime.toString()` (trailing-zero-trimmed nanos), `BigDecimal` as a JSON number with 2-decimal scale, JSONB columns as JSON strings, and the exact entity field order.
- **Pagination/search/sort contract** and the Spring error envelope (`{code, message, details, timestamp}`).

> The Java client called auth's register with query params — which the Rust auth service rejects (415). The Rust port uses the JSON-body contract, fixing a latent integration break.

---

## Verification: byte-for-byte comparison (prod Java vs staging Rust)

Before touching prod, we captured a baseline from the running Java backend and ran the **identical requests** against the Rust staging backend, then diffed the responses.

| Result | Count |
|---|---|
| Byte-identical responses | 14 / 18 |
| Differ only by unsorted-list row order | 3 / 18 |
| Prod-side test artifact (pre-existing) | 1 / 18 |

The "differences" were non-semantic: three endpoints return **unsorted lists** (Java's `findAll()` returns physical row order, which differs slightly between the two databases) and one prod row had a leftover test mutation. Every sorted/paginated list and every scoring result was **byte-identical** — including DISC profiles, Holland codes, PAPI trait details, CFIT IQ bands, and IST Wert/IQ values.

**Role creation & scoping were verified on staging:** the superadmin created a school, a counselor (gurubk), an affiliate (afiliator), and a student (siswa); each role logged in, saw only its scoped data (gurubk sees own school's students, gets 403 on admin-only endpoints), and the full DISC exam flow (assignment → check → questions → submit → scored result) ran end-to-end.

---

## Stress test: Java baseline vs Rust, same hardware, same load

200 VUs, 60s, mixed authenticated API read workload (dashboard, schools, users, test-categories, assignments, and all five exam results lists), 0% failures on both.

| Metric | Java (prod, CT 101) | Rust (staging, CT 1000) | Delta |
|---|---|---|---|
| Throughput | 1,335 req/s | 1,583 req/s | **Rust +19%** |
| Average latency | 21.18 ms | 4.07 ms | **−81%** |
| p95 latency | 58.63 ms | 15.01 ms | **−74%** |
| Max latency | 426.72 ms | 141.06 ms | **−67%** |
| Failures | 0% | 0% | — |
| Service memory | ~312 MB | ~11 MB | **~28x smaller** |

The Rust backend handled **more requests with ~4x lower tail latency** while using **~28x less memory**. The load test surfaced and fixed a few pagination bind-index bugs in the Rust port (the Java equivalent silently handled them) — a good example of the compiler/latency test finding real issues before users did.

---

## Ship to prod

Because the functional output and stress results matched (Rust equal or better on every axis), the feature branch was merged to `main` and the production deploy shipped the Rust backend. The swap:

1. configure.sh regenerated the ecosystem, detecting the backend as Rust.
2. The release binary replaced the Java service on CT 101.
3. Prod verified live: home 200, `/api/health` 200, admin login → superadmin, all result endpoints returning the same data.

The estate is now **entirely Rust** — no Java process runs anywhere on the prod CT, and the Java sources, `pom.xml`, and Flyway migrations were removed from the repo (the schema is unchanged and already deployed).

---

## Toolchain moved off the production CT

As part of the same effort, the Rust toolchain was cleared from CT 101 (prod)
so it can't compile anything: no cargo, no build caches. The build had already
shifted to the developer machine — `eco up --remote` cross-compiles Rust
binaries locally and ships them to the CT, so the production estate never
compiles from source. (This was the beginning of the dedicated-builder era,
which is itself retired now: the build farm lives on each developer machine.)

## Key takeaways

1. **Staging-first works.** A full Java backend can be ported to Rust and verified byte-identical against the live Java estate before prod is touched.
2. **Rust is not just smaller — it's faster under load.** +19% throughput and ~4x lower p95 on identical hardware, identical workload, identical data.
3. **Memory is the real constraint on a mini PC.** ~28x smaller per service means more domains and more estates fit on the same hardware.
4. **The toolchain learned a lot.** The migration forced real fixes to the build/ship path (atomic artifact transfer, correct source sync, workspace-root targeting) — all now committed upstream.

See the [Stress Testing at Scale](/case-study/stress-test) report for the wider Java-vs-Rust estate data, and the [Prod & Staging Workflow](/guide/prod-staging-workflow) guide for the deploy model used here.
