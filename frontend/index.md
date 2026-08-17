---
layout: home

hero:
  name: Ecosphere
  text: Compose reusable domains into self-sustaining estates
  tagline: "Stop rebuilding software — start composing capabilities. Ecosphere turns executable capabilities into reusable Linux Services (LXS) that compose into complete application estates — from a single developer to large teams, in the world of AI."
  image:
    src: /ecosphere-logo.png
    alt: Ecosphere
  actions:
    - theme: brand
      text: Show your app publicly
      link: /guide/serve
    - theme: alt
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why Ecosphere?
      link: /why/eco-vs-docker
    - theme: alt
      text: Stuff8 Case Study
      link: /case-study/stuff8

features:
  - title: Domains are reusable units
    details: Independent, self-sustaining bounded contexts — auth, photos, chat, bidding, rag — that can be recomposed into any new project.
  - title: Estates, not images
    details: One Proxmox CT is the machine boundary. An estate is the composition boundary. Services run natively, not in containers.
  - title: Docker-like workflow
    details: ecompose.yml + eco up give you the reproducibility of compose, mapped onto native CT provisioning and systemd.
  - title: One manifest to rule them
    details: CT metadata, runtimes, domains, and exposure are all declared in a single ecompose.yml.
  - title: Built-in exposure
    details: Cloudflare tunnel → proxy CT → estate gateway → services. One public hostname per estate, managed by eco.
  - title: Show it publicly — free
    details: "eco serve turns your locally-running app into a real public URL on a *.getecosphere.com subdomain. No domain to buy, no server to rent, HTTPS included. Start free; pay only when the app earns."
  - title: Build locally, ship the binary
    details: The build farm is on your machine — `eco up --remote` cross-compiles and ships artifacts. No build server, no toolchain on the CT.
  - title: Any new staff can produce
    details: Supporting domains are done already. New joiners compose veteran-designed contracts and ship — no years of hidden knowledge required.
  - title: A complete, holistic solution
    details: "From the ecology: not a single tool, but a self-sustaining system — domains, estates, environment, and orchestration working as one."
---

## Proven under load

**Sustained a 5,000-concurrent-VU synthetic workload on a $300 mini PC with graceful degradation.**

Ecosphere was penetration-tested in August 2026 on the same hardware it runs in production: an off-the-shelf Intel i3-1220P mini PC (7.3 GiB RAM), sharing CPU, memory, and disk with four other production estates. k6 drove 1,000 → 5,000 concurrent virtual users at two production estates through the internal gateway.

| What held up | The numbers |
|---|---|
| Throughput at 1,000 VUs | **2,767 req/s** (45.8 MB/s) |
| Throughput at 5,000 VUs | **1,920 req/s** — healthy, not collapsed |
| Degradation curve | **Linear** — ~250–400ms added per 1,000 VUs, CPU-bound not broken |
| Rust vs Java, same hardware | **20–40% faster**, **20–90x less memory** per service |
| Java → Rust live migration | **+19% throughput**, **−81% average latency**, **~28x smaller** service |

Read the full methodology and raw data — including the direct Java → Rust head-to-head on identical hardware — in the [stress-test report](/case-study/stress-test).
