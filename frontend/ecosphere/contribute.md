# Contributing LXS

The Ecosphere LXS domains are **open source** — public repositories under the
[`getecosphere`](https://github.com/getecosphere) account. Anyone can inspect,
fork, improve, and contribute the supporting capabilities every estate needs.

The seven free supporting domains are public:

| LXS | Repo |
| --- | --- |
| `auth` | github.com/getecosphere/auth |
| `storage` (domain: photos) | github.com/getecosphere/storage |
| `notifications` | github.com/getecosphere/notifications |
| `chat` | github.com/getecosphere/chat |
| `email-manager` | github.com/getecosphere/email-manager |
| `profile` | github.com/getecosphere/profile |
| `articles` | github.com/getecosphere/articles |

And the binary distribution layer — the **LXS Registry** — is public read-only
at [github.com/getecosphere/lxs-registry](https://github.com/getecosphere/lxs-registry):
anyone can clone it or `eco lxs pull` a versioned binary. Publishing to it is
gated.

## The contribution loop

```
fork → improve → pull request → maintainer merges → tag vX.Y.Z → CI publishes
```

1. **Fork** a public domain repo.
2. **Improve** the domain, keeping the `lxs.yml` contract honest.
3. Open a **pull request**. Maintainers review the domain + its contract.
4. On merge, a maintainer pushes a **`vX.Y.Z` tag**.
5. **CI** (`.github/workflows/lxs-publish.yml`) cross-compiles the LXS for
   `linux/amd64` (static musl), packages it with checksums + provenance, and
   publishes `name@version` to the LXS Registry under the canonical
   **Eco Creator** publisher identity.

## The contract is the review standard

An LXS is only as trustworthy as its `lxs.yml`. Contributions must keep:

- **Immutable versions** — a published `name@version` never changes; fix
  forward, never mutate.
- **Semantic versioning** — bump `MAJOR` on breaking contract changes, and the
  `contract.version` alongside it so estates can detect incompatibility before
  runtime.
- **Explicit contracts** — declare required/optional env, the database, network
  permissions, and resource profile. A third-party LXS must not implicitly gain
  access to every Estate resource.
- **No secrets** — credentials stay out of the repo and the manifest; the
  estate grants secrets via `ecompose.yml` `grants`.
- **Declared runtime** — prefer `self-contained-static`; list any native
  dependencies honestly (`runtime.dependencies`, e.g. `ffmpeg`, `redis`).

New community LXS start **`unverified`** until a verification process exists;
nothing is labelled `verified` prematurely.

## Identity

Published history carries the canonical publisher identity:

> **Eco Creator** &lt;dev@getecosphere.com&gt;

Contributor identities in pull requests remain their own; the registry's
published commits are attributed to Eco Creator to keep the platform's
distribution neutral.

See also: [The LXS Registry](/ecosphere/lxs-registry), [Introducing LXS](/ecosphere/), [Why Rust & Go?](/ecosphere/why-rust-and-go).
