# Route protection — deny by default

The hardest bug an estate can ship is a **protected route that's public**. An
admin panel, a users endpoint, a file upload — declared in code, never locked
down, and discoverable by anyone who can guess the URL.

Ecosphere's answer is the opposite of "remember to protect things": **everything is
denied unless you explicitly allow it.** Route protection is a declared part of
the estate, enforced at the edge by a gateway LXS — not a checkbox in each
service's code.

```yaml
auth:
  roles:
    - name: public
      level: public
    - name: authenticated
      level: auth
      default: true

services:
  profile-backend:
    lxs: profile@1.1.1
    access:
      routes:
        - path: /api/profile/*
          level: auth
```

That's the whole idea. `profile-backend` declares it only serves authenticated
users. Everything else the estate didn't declare — **denied**.

---

## The model: all deny, explicit allow

If you've used Spring Security, this is the "deny by default, allow explicitly"
filter-chain model — but declarative, at the gateway, for the whole estate:

```
request ──► gateway LXS ──► matched a declared route? ──► no  ──► 403
                                    │
                                    yes
                                    ▼
                            what level is the route?
                                │
            ┌───────────────────┼───────────────────┐
       public               auth                  role:<name>
            │                  │                       │
     forward as-is      verify JWT +           verify JWT +
                        role is not           role claim equals
                        `public`              the named role
            └───────────────────┼───────────────────┘
                                ▼
                  forward to the service, inject
                  `X-Eco-User: <sub>,roles=<role>`
```

Two things never happen: an undeclared route is never forwarded, and a request
never reaches a service with a client-supplied identity.

## Why the edge is the right place

Every service in an estate already trusts the shared `JWT_SECRET`. But "each
service re-verifies the token" is exactly the kind of repetition that leaks —
one service forgets, and that admin route is exposed.

The gateway verifies **once**, at the front door, and hands the identity
forward:

```
req + Bearer ──► gateway ──verifies──► X-Eco-User: 42,roles=admin
                                       │
                                       ▼
                                  backend service (trusts the edge)
```

- The gateway **strips** any `X-Eco-User` a client sends — only the gateway can
  set it.
- The original `Authorization` header is passed through too, so services that
  already verify JWTs keep working unchanged.
- The gateway runs as a plain HTTP reverse-proxy. TLS is already handled by the
  Cloudflare Tunnel at the edge, so there's no certificate burden to own.

## Declaring the identity model — `auth.roles`

Roles are a property of the **estate**, not of a binary. The auth LXS no
longer hardcodes roles; the estate declares them and eco wires them into the
auth service's environment:

```yaml
auth:
  roles:
    - name: public
      level: public       # the "not signed in" role
    - name: authenticated
      level: auth         # any valid session
      default: true       # assigned to new accounts at registration
```

- New accounts get the role marked `default: true`.
- A registration that requests a role outside the declared set is **rejected** —
  asking for `role: admin` when no admin role is declared fails at the API.

## Declaring routes — `access.routes`

Every HTTP service declares which routes it exposes and at what level.
Undeclared routes are denied by default.

```yaml
services:
  auth-backend:
    lxs: auth@1.2.0
    access:
      routes:
        - path: /api/auth/login
          level: public      # token issuance must be reachable
        - path: /api/auth/register
          level: public
        - path: /api/auth/*
          level: auth        # everything else behind a session
```

Levels:

| level | meaning |
|---|---|
| `public` | no token required |
| `auth` | a valid bearer token whose role is not `public` |
| `role:<name>` | a valid token whose `role` claim equals `<name>` |

Matching is **longest-prefix, exact beats wildcard**: a route `path: /api/auth/*`
plus a more specific `path: /api/auth/login` means login is public while
`/api/auth/me` stays protected.

### Path rewriting

Some services expect a different path than the one browsers hit. Mirror Caddy's
`uri replace` with `strip` + `rewrite`:

```yaml
- path: /auth-api/auth/login
  level: public
  strip: /auth-api
  rewrite: /api       # forwarded upstream as /api/auth/login
```

## The gateway LXS

Declaring a `gateway` service in the estate switches it from the generated
Caddyfile to a **gateway LXS** — a single static binary that routes, verifies,
and enforces:

```yaml
services:
  gateway:
    lxs: gateway@0.1.0

estates:
  proof-rust:
    services:
      - gateway        # front door first
      - proof-rust
      - auth-backend
      ...
```

`eco up` then:

1. writes `gateway.json` — the route table (paths → upstream ports → levels)
   built from every service's `access.routes` plus the `auth.roles` model,
2. ships the gateway binary,
3. runs it as the estate's gateway unit,
4. points the tunnel at it.

No Caddy, no hand-edited proxy config. The gateway is a versioned, publishable
LXS like any other capability.

## Proof on proof-rust

The [proof-rust estate](https://proof-rust.getecosphere.com) runs this end to
end. Roles `public` / `authenticated`; five users registered; a sixth attempted
`role: admin` and was **rejected** at the API. Live results through the public
URL:

| request | level | result |
|---|---|---|
| `GET /` (frontend) | public | 200 |
| `POST /api/auth/login` | public | 200 — token issued |
| `GET /notdeclared` | — | **403** deny-by-default |
| `GET /api/undeclared` | — | **403** deny-by-default |
| `GET /dashboard` (no token) | auth | **401** |
| `GET /dashboard` (authenticated) | auth | 200 |
| `GET /dashboard` (public role) | auth | **403** — public is not authenticated |
| `GET /api/users/:id` (authenticated) | auth | 200 |
| `GET /api/users/:id` (public role) | auth | **403** |

The frontend is composed of the same single binaries that ran on the old
gateway — nothing changed in the services. The protection appeared by
declaration.

---

## Reference

The full syntax, in one manifest:

```yaml
auth:
  roles:
    - name: <role>
      level: public | auth | role:<name>
      default: true           # optional; one role is the registration default

services:
  <service>:
    lxs: <name>@<version>     # or path: <dir>, runtimes: [rust]
    access:
      routes:
        - path: /prefix/*     # wildcard: matches everything under the prefix
          level: public | auth | role:<name>
          strip: /prefix      # optional path rewrite (upstream prefix)
          rewrite: /replacement
```

Rules of thumb:

- **Deny by default is the default.** Declare what's public; everything else is
  locked.
- A route's `level: public` is an *explicit* act — it reads clearly in review.
- Privilege escalation is blocked at registration (undeclared roles rejected).
- The generated gateway is an artifact. Edit the manifest and re-deploy; never
  hand-edit the gateway.
