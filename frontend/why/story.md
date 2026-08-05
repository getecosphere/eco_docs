# The story behind Eco

Every framework has an origin story. Eco's is a 2017 MacBook Pro, a lot of spinning fans, and a developer who got tired of waiting.

## The MacBook Pro 2017 that started it all

Eco was born from a genuinely funny situation: its developer was building software on an **old MacBook Pro (2017)** — a machine that was already showing its age when Docker was the obvious answer to everything.

Here's the problem. Docker works beautifully on a beefy workstation. On a 2017 MacBook Pro, every `docker compose up` meant:

- fans spinning up like a jet engine
- several gigabytes of images and layers
- minutes of waiting for containers to build and start
- a laptop too hot to use while anything was running

Meanwhile, an AI assistant was doing most of the coding. And every iteration meant the whole container dance again. **The tooling was the bottleneck — not the code, not the AI. The developer.**

At some point the developer looked at the spinning fans and thought the obvious thought:

> Why am I paying for a whole virtual machine's worth of isolation for every tiny service? I just want my projects to run. Natively. On this poor laptop.

And so Eco was born — as a deliberate **Docker alternative**: same reproducibility, same compose-style workflow, but with services running as plain native processes on a Proxmox CT. No images to pull, no layers to mount, no daemon to babysit.

It's a little absurd that a software framework for composing production estates was motivated by an aging laptop overheating — but that's exactly the kind of constraint that produces honest engineering. **The cheapest tool that does the job wins.**

## The AI journey: from many tools to OpenCode + DeepSeek

Eco's developer spent a long time in the AI tooling landscape before settling on the current stack.

**Tried first (and moved on from):**

- **Windsurf** — a capable AI editor, but not the right fit
- **Cursor** — popular and polished, but the developer wanted something leaner
- **Kiro** — evaluated, not settled on
- **Claude** — great quality, but expensive at the volumes involved
- **OpenAI** — the original, but the cost and latency didn't hold up for day-to-day iteration

**Settled on:**

- **OpenCode** — a sleek CLI-first AI coding agent. Its terminal-native interface fits exactly how Eco is built: fast, scriptable, no heavyweight GUI. For a developer building a CLI tool, working in a CLI felt right.
- **DeepSeek** — blazingly fast, smart, and **cheap**. The economics matter when an AI writes a large fraction of your code. DeepSeek's quality-to-price ratio made it the obvious long-term partner.

This choice is visible throughout Eco's design. Eco optimizes for exactly what makes agent-driven development cheap:

- **native processes** — an agent restarts a service in milliseconds, not minutes
- **one manifest** — the agent reads `ecompose.yml` and knows the whole estate
- **domain contracts** — the agent composes veteran-written boundaries instead of re-deriving them
- **fast feedback** — `eco up`, rebuild, verify; the loop is tight

Eco is, in a very real sense, a framework *for* this workflow: built by an AI-assisted developer, on a humble laptop, to remove every minute of wasted waiting from the loop.

## Why this matters to you

You don't need a 2017 MacBook Pro to benefit. But the philosophy scales:

- if the tools are the bottleneck, make the tools lean
- if AI removed the learning curve, use the fastest, smallest option
- if a framework can remove waiting, it removes cost from every future feature

That's the origin of Eco: **a funny laptop situation that produced a serious framework.**

See also: [Why the name "Eco"](/why/the-name), [Why Eco promotes Rust](/why/why-rust), [Eco vs Docker](/why/eco-vs-docker).
