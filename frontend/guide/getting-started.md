# Getting Started

Eco is a private Node CLI that manages large-scale projects using Domain-Driven Design. It decomposes projects into independent, self-sustaining domains that can be reused and recomposed into new projects.

> **Eco is not released yet.** The public installer and distribution channels are coming soon. The commands below show what the workflow will look like; watch this space.

## Requirements

- A Proxmox VE host (or a local dev machine for `eco up dev`)
- Node.js 20+
- git
- A GitHub account with a personal access token (for creating and pushing repos)

## Install — coming soon

Eco has not been released publicly yet. When it is, installation will be a single command — either through npm:

```bash
npm install -g eco
```

or a direct installer script:

```bash
curl -fsSL https://get.eco.stuff8.com/install.sh | sh
```

Both are currently marked **COMING SOON**. Until then, Eco runs from source in development.

Verify the install:

```bash
eco help
```

## Your first estate

`eco startproject` creates two repositories automatically and publishes them to GitHub:

- `<project>_bootstrap` — the estate manifest (`ecompose.yml`)
- `<project>_composition` — the frontend (and optional backend) application

```bash
export ECO_GITHUB_API_KEY="ghp_xxx"

eco startproject
```

Answer the prompts: pick a project name, select the domains you want to compose, choose a CT ID, and set a public hostname.

## Run it locally

From the estate root:

```bash
cd <project>
eco up
```

Eco reads `ecompose.yml`, clones the composed domains, installs runtimes, wires `.env` files, and starts the services under PM2.

## Deploy to Proxmox

On your Proxmox host:

```bash
git clone <your-estate-bootstrap-repo.git> /root/<project>_bootstrap
cd /root/<project>_bootstrap
eco up
```

`eco up` will create the CT (if needed), clone the domains, provision runtimes, generate env files, start services, and expose the estate at your public hostname.

## Next steps

- [Quick Start](/guide/quick-start) — the actual command flow
- [Concepts](/concepts/domains) — domains, estates, and composition
- [ecompose.yml reference](/reference/ecompose) — the manifest format
