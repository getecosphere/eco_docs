# Why Ecosphere considered Go (and chose Rust)

**Go and Rust are the two languages that come closest to Ecosphere's ideal: compile to a native binary, start in milliseconds, run lean on shared hardware. Ecosphere deployed one Go service in production for over a year before rewriting it in Rust. Here is why Go was a genuine contender — and why Rust won.**

---

## What Go gets right

Go was designed at Google in 2007 by three legends — Rob Pike (Unix, UTF-8), Ken Thompson (Unix, C, UTF-8), and Robert Griesemer (V8, Java HotSpot). Their stated goal: a language for the kind of large-scale server software Google builds, where hundreds of engineers maintain millions of lines of code. Go 1.0 was released in March 2012.

Go is intentionally **boring**. The spec is small enough to read in an afternoon. There are no classes, no inheritance, no exceptions, no annotations. The philosophy: a team of average programmers can read and maintain Go code written by another team five years ago — which is exactly what happens inside Google.

### The numbers that mattered to Ecosphere

| Metric | Go | Notes |
|---|---|---|
| Binary size | ~10–20 MB | Statically linked, no runtime. Larger than Rust (~1–5 MB) but vastly smaller than a JVM. |
| Startup time | ~10–50 ms | Warm-up is near-instant. No JIT, no class loading. |
| Concurrency | goroutines | Lightweight green threads multiplexed onto OS threads. For a WebSocket hub (our `notifications` service), this was a perfect fit — one goroutine per connection, no async/await ceremony. |
| Garbage collector | Concurrent, pauseless since Go 1.5 | Sub-millisecond pauses for most workloads. Not as predictable as Rust's no-GC, but far ahead of Java's stop-the-world pauses. |
| Standard library | Batteries included | `net/http`, `crypto`, `encoding/json`, `database/sql` — everything needed for a web service is in the standard library. No framework ecosystem drama. |
| Learning curve | Gentle | A Java or Python developer is productive in Go within a week. The `gofmt` tool enforces a single code style — no formatting debates. |
| Cross-compilation | `GOOS=linux GOARCH=arm64 go build` | Cross-compilation is trivial and fast. Go's linker produces a single static binary for any target. |

---

## Who uses Go

Go powers some of the most heavily-trafficked infrastructure on the internet:

| Company | What | Notes |
|---|---|---|
| **Google** | Everything — the language's origin | YouTube's vitess (MySQL sharding), Google's download server (dl.google.com), parts of the search index. Google runs more Go than any other company. |
| **Docker** | The entire Docker platform | Docker was written in Go from the start (2013). Every container on Earth runs because of a Go binary. |
| **Kubernetes** | The entire orchestration system | The largest Go project in the world — millions of lines, thousands of contributors. Kubernetes is the reason Go became the default language for cloud-native infrastructure. |
| **Uber** | Microservice fleet, geofence engine | Uber's backend runs on thousands of Go services. Their geofence engine processes millions of real-time location events. |
| **Twitch** | Chat infrastructure | Twitch chat uses Go to serve messages to millions of concurrent viewers. Goroutines per connection, exactly the pattern Go excels at. |
| **HashiCorp** | Terraform, Vault, Consul, Nomad | Every HashiCorp product is a single Go binary. `terraform` is likely the most-used Go binary outside of Docker and Kubernetes. |
| **Dropbox** | Core sync engine (before Rust migration) | Dropbox ran Go in production for years before migrating performance-critical paths to Rust. Their public post-mortems on Go's GC issues at scale are required reading. |
| **Cloudflare** | DNS (RRDNS), Tunnel, many other tools | Cloudflare entered Rust later but Go was their workhorse for years. |
| **Netflix** | Caching layer, data pipeline orchestrators | Netflix uses Go for real-time data processing pipelines at global scale. |
| **BBC** | iPlayer, public-facing API backends | The BBC runs Go in production for one of the world's largest streaming platforms. |

---

## The Go vs Rust comparison on Ecosphere's terms

Ecosphere cares about one question: what is the cheapest way to run a domain on shared hardware? Both Go and Rust are in the top tier. Here is the nitty-gritty:

| Concern | Go | Rust | Edge |
|---|---|---|---|
| **Binary size** | ~10–20 MB | ~1–5 MB | Rust |
| **Memory (idle)** | ~8–12 MB | ~4–8 MB | Rust is ~2x smaller |
| **Memory (under load)** | GC overhead adds ~10–30% | No GC overhead | Rust is predictable |
| **Startup time** | ~10–50 ms | ~1–5 ms | Rust |
| **Concurrency** | goroutines — simpler model for I/O | async/await — more control for CPU | Tie (different strengths) |
| **GC pauses** | Low (sub-ms in modern Go) | None | Rust, but Go's are small now |
| **Learning curve** | Gentle | Steep without AI | Go |
| **Developer speed** | Fast (simple syntax, fast compile) | Moderate (borrow checker, longer compile) | Go |
| **Standard library** | Large and polished | Minimal but growing | Go |
| **Ecosystem maturity** | Huge for cloud services | Growing fast, strong in systems | Tie |
| **Cross-compilation** | Trivial (`GOOS=linux go build`) | Needs `cross` / linker config | Go |
| **Correctness guarantees** | `nil` pointers, data races possible | Compile-time guarantees, no data races | Rust |
| **Composability** | Each binary is separate — no crate linking | Cargo workspace links arbitrary crates into one binary | **Rust (decisive for single-binary)** |

Go and Rust are both excellent. For a standalone WebSocket service, Go's goroutine-per-connection model is easier to write correctly than Rust's async/await WebSocket actor. For an estate of 9 Rust domains that Ecosphere wants to optionally collapse into one binary, **Rust wins by default**: Cargo can link any number of Rust crates into one binary; Go cannot participate in a Rust workspace.

---

## Why Go's garbage collector is not a dealbreaker (anymore)

The old objection to Go — "GC pauses kill tail latency" — was true in Go 1.4 and earlier. Since Go 1.5 (2015), the GC has been concurrent and pause times are typically under 100 *microseconds*. For an HTTP request that takes 10–50 milliseconds inside the handler, a 100µs pause is invisible.

Discord's famous blog post about switching from Go to Rust described GC pauses of **multiple seconds** under load. That was Go 1.9 in 2019. The GC has improved substantially since then, and Discord's workload (caching millions of in-memory objects) is a GC stress-test few services ever hit. Ecosphere's domains — stateless HTTP handlers backed by MongoDB — see almost no GC pressure. The GC argument against Go today is about *predictability*, not latency. Rust gives you exact, compile-time memory behavior; Go gives you "good enough" 99.999% of the time.

---

## What Ecosphere still uses Go for

After the notifications rewrite, the Stuff8 estate has **zero Go**. But Ecosphere as a framework still treats Go as a first-class runtime:

- `ecompose.yml` supports `runtimes: [golang, mongodb@7]`
- eco provisions GCC (the Go toolchain) on CTs just like it provisions Rust
- `eco up` knows how to build a Go module and deploy the binary

The Go → Rust conversion was not a rejection of Go. It was a **unification**: when 8 of 9 domains are Rust, the operational cost of maintaining one more toolchain, one more build step, one more set of dependencies, and one more process outweighed the benefits of Go's simpler concurrency model.

For a standalone service — especially a connection-heavy real-time service where goroutines shine — Go is still an excellent choice in any Ecosphere estate.

---

## The verdict

> Go is the closest language to Rust in Ecosphere's runtime ideal — small static binary, fast startup, lean memory. For a standalone service, the two are nearly equal. In an estate that already runs Rust and wants single-binary composition, Rust's Cargo workspace capability is the tiebreaker.

Rust is not "better" than Go. It is more *composable* for Ecosphere's specific use case: many small domains that may or may not share a process.

See: [Why Rust](/why/why-rust), [The Go → Rust conversion](/case-study/go-to-rust), [Keeping Multi-Binary](/case-study/keeping-multi-binary).
