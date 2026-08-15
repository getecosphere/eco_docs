# PM2 → systemd: the journey

> PM2 is a Node program. The end-state is a CT with **no Node at all** — so PM2
> had to go. systemd is what replaced it.

## Why

Two forces pushed us off PM2:

1. **The "no Node on production CTs" goal.** Frontends are now built off-CT on
   the developer machine and shipped as `dist`; the only Node left on a CT is
   the *preview runtime*. PM2 itself is a Node program — you can't remove Node
   and keep PM2.
2. **systemd is the native, stronger primitive.** cgroup v2 resource limits
   (`MemoryMax`/`CPUQuota`) mean one leaky service is OOM-killed at its own
   boundary and can never take down the estate; `WatchdogSec` gives active
   health-based restart; journald gives structured logs; `Restart=always` +
   `StartLimitIntervalSec` handle crash loops; boot integration is built in.

**PM2 stays on the dev machine** (`eco up dev`) — it's perfect for local
development. systemd is the **CT runtime**.

## How it works

`configure.sh` already resolves every service to `(name, cwd, script, args,
interpreter)` for the PM2 config. With `ECO_SYSTEMD=1`, it now ALSO emits one
`eco-<app>.service` per app into `/etc/systemd/system` (parsing the same
`ecosystem.config.js` with Node), and the deploy restarts services via
`systemctl` instead of `pm2 startOrReload`.

```
[Unit]
Description=assessment-auth-backend
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=/opt/projects/assessment/auth-backend
EnvironmentFile=/opt/projects/assessment/auth-backend/.env
ExecStart=/usr/bin/bash start.sh
Restart=always
RestartSec=2
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
```

`eco up --remote` deploys with `ECO_SYSTEMD=1` set on the `eco serve` agent:
- `configure.sh` writes the units (gated by `ECO_SYSTEMD=1`)
- the deploy stops old PM2 apps, then `systemctl daemon-reload` + `enable` +
  `reset-failed` + `restart` for each unit
- the `eco serve` agent itself runs as a unit

## What actually bit us (the journey)

These are the real bugs we hit migrating the assessment estate on staging:

- **The `eco serve` agent caches its binary in memory.** Swapping
  `/usr/local/bin/eco` on the host does nothing until the agent restarts —
  every "fix" silently didn't run. `systemctl restart eco-serve` (or
  `pkill -f 'eco serve'`) after any binary swap.
- **The CT runs a stale `configure.sh`.** In remote mode the CT's
  `/opt/projects/eco/configure.sh` predates the change. The agent now pushes
  its own (current) binary to the CT and materializes `configure.sh` from it
  (`eco __bundle-configure-sh`) before running it.
- **`${GREEN}` (a bash color var) inside the Node unit generator** crashed
  Node after the first unit — only one unit was ever written. Node can't see
  bash's variables.
- **`StartLimitIntervalSec` belongs in `[Unit]`, not `[Service]`** on modern
  systemd — harmless warning, but wrong.
- **A fragile `&&`-chained `systemctl` start** stops at the first failed unit.
  Use `;` + `|| true` so one broken unit can't take down the rest.
- **First `systemctl list-units` check right after deploy** showed almost
  nothing — services were still crash-restarting into place. `Restart=always`
  converges; wait a moment before checking.

## Status

- [x] `configure.sh` emits systemd units (`ECO_SYSTEMD=1`)
- [x] `eco up --remote` deploys + restarts via `systemctl`
- [x] Migrated **assessment staging (CT 1000)** — all 8 services on systemd,
      PM2 removed from the CT, frontend serving HTTP 200
- [ ] Migrate the remaining staging estates (stuff8, getecosphere, chronic)
- [ ] Purge node/npm/pm2 from CT 101 (production)
