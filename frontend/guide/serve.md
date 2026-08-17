# eco serve — show your app to the world, right from your machine

You built something. Your `eco up dev` is running it on `localhost`. Now what —
buy a domain, rent a server, fiddle with reverse proxies and TLS just so a
friend, a client, or a whole classroom can actually *see* it?

**No.** `eco serve` gives your locally-running app a real public URL in one
command — on a free `*.getecosphere.com` subdomain, through a Cloudflare
tunnel, with HTTPS handled for you.

```bash
eco up dev                 # your app is live on localhost
eco serve mentoring        # ...and now the world can see it
```

```
  Public URL: https://mentoring.getecosphere.com
  Local app:  http://localhost:3000

  Press Ctrl+C to stop the tunnel and release the subdomain.
```

That's it. No domain to buy. No DNS to configure. No server to rent. No TLS to
figure out. Your laptop *is* the server, and eco handles everything between it
and the internet.

---

## Why this changes the game

Building software used to have a hidden tax on the *first visible step*. Before
you could show anyone anything, you needed:

- a domain (≈$10–15/year, plus deciding which registrar)
- a server or VPS (≈$5–100/month, plus SSH keys, firewalls, uptime worries)
- DNS records pointing at that server
- TLS certificates so browsers didn't scream warnings
- a deployment pipeline so the running thing matched your code

That's hours to days of yak-shaving **before your idea is even visible**. Most
people give up in this gap — not because the idea is bad, but because the
*showing* is expensive.

`eco serve` collapses that entire step into one command. The thing you already
built on your machine — the thing that's already running — becomes the thing
the world can visit.

### Keep your machine running, keep your app up

There's no separate deploy step. As long as your process is running locally,
your app is up on the public URL. Edit code → save → the running server
reloads → the public URL reflects it. It's the tightest possible feedback loop
between "what you're building" and "what people see."

When you stop, the tunnel closes and the subdomain is released — no orphaned
servers, no surprise bills.

### Start free. Pay when you grow.

This is the part that matters for real-world builders:

- **Day one — free.** Your machine hosts the app. The tunnel, the subdomain,
  and the HTTPS are all free.
- **Until you earn.** You can run your whole pilot — real users, real usage —
  with zero infrastructure cost. The only thing you're paying is your own
  electricity.
- **When you're ready to grow.** Once the project earns money, you move to a
  managed Ecosphere estate: a real server, your own domain, scaling, and backups —
  now funded by the revenue the app is actually generating.

No upfront bet. The cost of trying your idea out is exactly zero, and the cost
of running it at scale appears *only after* it's making money. Infrastructure
should never be the reason a good idea stays private.

---

## Real example: a teacher opens online mentoring

Meet **Bu Ratna**. She's a math teacher who has been tutoring neighborhood kids
at her kitchen table for years. Word spread — now parents from other schools
are asking if their children can join.

Her problem: parents want *proof* it's real. They want to see the schedule,
talk to her, join a session — not just hear about it. But she's not a
developer, and she doesn't have a website, a domain, or a server.

Here's how Ecosphere + `eco serve` changes her week:

**Step 1 — she gets her mentoring app.**

A developer friend (or an AI assistant, or eco's `startproject`) scaffolds her
a small mentoring app: a schedule, a signup form, a private chat for students
and parents, and a place to post notes. It's a normal Ecosphere estate composed from
reusable domains — auth, chat, notifications.

**Step 2 — she runs it locally.**

```bash
eco up dev        # app is running on her laptop
eco serve bu-ratna
```

```
  Public URL: https://bu-ratna.getecosphere.com
```

**Step 3 — she shares the link.**

She sends `https://bu-ratna.getecosphere.com` to the parents' WhatsApp group.
They open it on their phones. They see the schedule. They sign up. They message
her through the app. No one asks "what's this domain thing" — it just *works*,
and it's a proper HTTPS link.

**Step 4 — her laptop becomes her office.**

During tutoring hours, the app is live because her laptop is on. She runs her
sessions, checks messages between students, and every change she makes updates
the live site instantly. She doesn't think about servers once.

**Step 5 — when it grows, it pays for itself.**

Two months in, she has thirty students and the app is earning her real income.
Now it's worth moving to a managed estate — a proper always-on server, her own
domain (`bu-ratna-mentor.id`), automatic backups. The infrastructure she now
pays for is funded by the tutoring that's happening *because* the app was
visible when it was free.

She never had to risk money to start. The idea was public on day one; the
server bill only arrived after the money did.

> **The takeaway:** a teacher with zero infrastructure knowledge and zero budget
> got a professional, HTTPS-secured, publicly-visible app running from her own
> laptop — and grew into a paid setup only after it was already working.
> That's the whole point of `eco serve`.

---

## How it works

Under the hood, `eco serve` is deliberately boring and reliable:

1. **You pick a subdomain.** `eco serve <name>` — lowercase letters, digits,
   hyphens. You choose it.
2. **eco checks for conflicts.** A host-side registry (plus authoritative
   Cloudflare DNS) makes sure `<name>.getecosphere.com` isn't already taken.
3. **eco opens a tunnel.** A `cloudflared` tunnel connects your local port to
   Cloudflare's edge — outbound from your machine, so no inbound ports or
   firewall holes are needed.
4. **eco wires up DNS.** A CNAME points `<name>.getecosphere.com` at the
   tunnel. HTTPS is automatic through Cloudflare.
5. **Your choice is recorded.** `serve.subdomain` is written into
   `ecompose.yml`, so `eco serve` reuses it next time.
6. **Ctrl+C releases it.** The tunnel closes, the subdomain is freed.

```yaml
# ecompose.yml (after the first eco serve)
serve:
  subdomain: bu-ratna
  enabled: true
```

## Command reference

```bash
eco serve <subdomain> [--port <port>]   # expose a local app publicly
eco serve <subdomain> --release          # tear down an existing tunnel
eco serve stop <subdomain>              # stop + release
eco serve list                          # show active tunnels on this host
eco serve help                          # full usage
```

- **`--port`** — the local port of your app. If omitted, eco reads
  `expose.target_port` from `ecompose.yml`, then falls back to `3000`.
- Same-origin by design: the Next.js / Vite / any frontend talks to your
  backends through eco-managed routing, so there are no CORS surprises when
  the world visits your public URL.

---

## When to use it vs. a full estate

| | `eco serve` | Managed estate |
|---|---|---|
| **What runs it** | your local machine | a Proxmox CT / server |
| **Cost** | free (your electricity) | paid, once it earns |
| **Uptime** | while your machine is on | always-on |
| **Domain** | free `*.getecosphere.com` | your own |
| **Best for** | pilots, demos, mentoring, MVPs, sharing with a client | production, growth, teams |

`eco serve` is the *first step* of the same journey: build on your machine →
show the world for free → earn → move to a managed estate, funded by what you
earned. The migration path is the same Ecosphere workflow (`ecompose.yml` → `eco
up`), so nothing you build for `eco serve` is wasted when you scale.
