# Scaling

This model scales, but differently from Kubernetes-style infrastructure.

## The scaling unit is the estate

- **Primary scaling unit**: one application estate packaged into one Proxmox CT
- **Not**: one individual service replica

A CT can host one or more estates, so the estate — not the CT — is the composition unit. Small estates share a CT; large or sensitive ones get a CT of their own.

## Scaling story

- **Scale within** — compose more estates onto one CT when they are small enough to coexist
- **Scale out** — create more CTs
- **Scale up** — increase CT resources
- **Scale across** — use more Proxmox nodes

This is a valid operational path if the real goal is to run many isolated composed solutions with predictable runtime control.

## Likely stages

### 1. Single host
One Proxmox host runs several CTs. eco is responsible for creating CTs, provisioning runtimes, composing repos, and configuring services.

### 2. Proxmox cluster
Multiple hosts form a cluster: spread CTs across nodes, live migration, better resilience. The estate model stays the same.

### 3. Multi-estate automation
eco becomes the operational control plane: CT creation, estate bootstrap, project updates, repeated deployments.

### 4. Backup, recovery, mobility
Standardize backup, restore, snapshot, and CT migration. eco owns estate bootstrap and runtime readiness; each project owns its own data export/import formats and snapshot semantics.

## What it does less naturally

Per-service elastic scaling inside a single estate. This architecture is better suited to scaling application estates as self-contained units rather than scaling each service independently under a dynamic scheduler.
