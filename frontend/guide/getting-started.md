# Getting Started

eco is a **compiled Rust CLI** that manages large-scale projects using Domain-Driven Design. It decomposes projects into independent, self-sustaining domains that can be reused and recomposed into new projects. Builds happen on your machine; the artifacts ship to the server.

## Requirements

- A Proxmox VE host with the `eco serve` agent running (the deploy endpoint)
- A developer machine with the `eco` binary: Rust toolchain (for `eco up --remote` cross-compiles), Node/Bun for frontends
- git
- A GitHub account with a personal access token (for `startproject` creating repos)

## Install

Installation is a single command:

```bash
curl -fsSL https://getecosphere.com/install.sh | sh
```

Verify the install:

```bash
eco help
```

## Your first estate

`eco startproject` creates the estate repository and publishes it to GitHub:

```bash
export ECO_GITHUB_API_KEY="ghp_xxx"

eco startproject
```

Answer the prompts: pick a project name, select the domains you want to compose, choose a CT ID, and set a public hostname.

## Run it locally

From the estate root:

```bash
cd <project>
eco up dev
```

eco reads `ecompose.yml`, provisions runtimes locally, wires `.env` files, builds Rust services, and starts them (under PM2 for local dev).

## Deploy to Proxmox

Still on your developer machine:

```bash
eco up --remote
```

eco cross-compiles the Rust services and builds the frontends locally, then ships the artifacts to the `eco serve` agent on the host. The agent provisions the CT, installs the artifacts, runs migrations, and restarts the services under systemd — the CT never compiles anything.

## Next steps

- [Quick Start](/guide/quick-start) — the actual command flow
- [Concepts](/concepts/domains) — domains, estates, and composition
- [ecompose.yml reference](/reference/ecompose) — the manifest format
- [Deploy without webhooks](/guide/deploy-without-webhooks) — why deploys are explicit
