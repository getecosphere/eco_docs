# eco_docs_composition

VitePress documentation site for the **eco** framework, deployed at
`https://eco.stuff8.com` from CT 101 (shared with the `stuff8` estate).

## Working agreements

- **This is the home of all eco documentation.** Writing documentation for
  eco — guides, concepts, references, case studies — happens in this repo's
  `frontend/` directory. Do not treat eco's `README.md` as the docs home; it
  is the internal operating manual.
- **Add pages in the matching section** and register them in
  `frontend/.vitepress/config.mjs` (sidebar + nav).
- **Diagrams use Mermaid** code fences (` ```mermaid `) rendered by
  `vitepress-plugin-mermaid`.
- **Simple documentation changes** (a new page, a wording fix, a diagram):
  edit here, commit, push, then deploy with `eco up --remote` from the estate
  root.
- **Big work that is not simple documenting** — e.g. a new eco command, a
  manifest/runtime behavior change, or a feature that needs both docs and
  implementation — belongs in the `eco` repo first. Update the docs here
  only *after* the eco implementation exists and the behavior is stable.
- **Never document internal operations publicly** (Tailscale gotchas,
  Cloudflare token scopes, Proxmox host commands, working agreements).
  Those stay in eco's internal `README.md`.

## Structure

```
eco_docs_composition/
└── frontend/            # VitePress site (docs source)
```

- `index.md` — landing page
- `guide/` — getting started, quick start
- `concepts/` — domains, estates, composition, scaling
- `reference/` — ecompose.yml, CLI, architecture
- `case-study/` — Stuff8 (the reference estate)

## Run locally

```bash
cd frontend
npm install
npm run dev     # dev server
npm run build   # static build
```

## Deploy

Deploy from the developer machine with `eco up --remote` from the estate root
(the docs estate runs on CT 101, shared with the `stuff8` estate).
