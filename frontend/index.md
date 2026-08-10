---
layout: home

hero:
  name: Eco
  text: Compose reusable domains into self-sustaining estates
  tagline: A host-native DDD platform for Proxmox. Build once, reuse everywhere — with a Docker-like developer experience, no Docker required. End-to-end, from a single developer to large teams, in the world of AI. Not yet released — be first to know.
  image:
    src: /og-image.png
    alt: Eco
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why Eco?
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
    details: ecompose.yml + eco up give you the reproducibility of compose, mapped onto native CT provisioning and PM2.
  - title: One manifest to rule them
    details: CT metadata, runtimes, domains, exposure, and CI/CD are all declared in a single ecompose.yml.
  - title: Built-in exposure
    details: Cloudflare tunnel → proxy CT → estate gateway → services. One public hostname per estate, managed by Eco.
  - title: Webhook deploys
    details: Push to main and Eco pulls, rebuilds, and reloads every service in the estate automatically.
  - title: Any new staff can produce
    details: Supporting domains are done already. New joiners compose veteran-designed contracts and ship — no years of hidden knowledge required.
  - title: A complete, holistic solution
    details: "From the ecology: not a single tool, but a self-sustaining system — domains, estates, environment, and orchestration working as one."
---

## Proven under load

**Sustained a 5,000-concurrent-VU synthetic workload on a $300 mini PC with graceful degradation.**

Eco was penetration-tested in August 2026 on the same hardware it runs in production: an off-the-shelf Intel i3-1220P mini PC (7.3 GiB RAM), sharing CPU, memory, and disk with four other production estates. k6 drove 1,000 → 5,000 concurrent virtual users at two production estates through the internal gateway.

| What held up | The numbers |
|---|---|
| Throughput at 1,000 VUs | **2,767 req/s** (45.8 MB/s) |
| Throughput at 5,000 VUs | **1,920 req/s** — healthy, not collapsed |
| Degradation curve | **Linear** — ~250–400ms added per 1,000 VUs, CPU-bound not broken |
| Rust vs Java, same hardware | **20–40% faster**, **20–90x less memory** per service |
| Java → Rust live migration | **+19% throughput**, **−81% average latency**, **~28x smaller** service |

Read the full methodology and raw data — including the direct Java → Rust head-to-head on identical hardware — in the [stress-test report](/case-study/stress-test).
