---
layout: home

hero:
  name: eco
  text: Compose reusable domains into self-sustaining estates
  tagline: A host-native DDD platform for Proxmox. Build once, reuse everywhere — with a Docker-like developer experience, no Docker required.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Stuff8 Case Study
      link: /case-study/stuff8

features:
  - title: Domains are reusable units
    details: Independent, self-sustaining bounded contexts — auth, photos, chat, bidding — that can be recomposed into any new project.
  - title: Estates, not images
    details: One Proxmox CT is the machine boundary. An estate is the composition boundary. Services run natively, not in containers.
  - title: Docker-like workflow
    details: ecompose.yml + eco up give you the reproducibility of compose, mapped onto native CT provisioning and PM2.
  - title: One manifest to rule them
    details: CT metadata, runtimes, domains, exposure, and CI/CD are all declared in a single ecompose.yml.
  - title: Built-in exposure
    details: Cloudflare tunnel → proxy CT → estate gateway → services. One public hostname per estate, managed by eco.
  - title: Webhook deploys
    details: Push to main and eco pulls, rebuilds, and reloads every service in the estate automatically.
---
