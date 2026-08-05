# eco_docs_composition

VitePress documentation site for the **eco** framework, deployed at
`https://eco.stuff8.com` from CT 101.

## Structure

```
eco_docs_composition/
└── frontend/            # VitePress site (docs source)
```

## Writing docs

All documentation content lives in `frontend/`:

- `index.md` — landing page
- `guide/` — getting started, quick start
- `concepts/` — domains, estates, composition, scaling
- `reference/` — ecompose.yml, CLI, architecture
- `case-study/` — Stuff8 (the reference estate)

Add pages in the matching directory and register them in
`frontend/.vitepress/config.mjs` (sidebar/nav).

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Deploy

Pushes to `main` trigger the estate webhook redeploy on CT 101.
Manual deploy: `cd /root/projects/eco_docs_bootstrap && eco up`.
