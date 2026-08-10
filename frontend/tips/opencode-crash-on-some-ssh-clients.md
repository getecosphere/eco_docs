# opencode crashes on some SSH clients (`illegal hardware instruction`)

**Symptom:** running `opencode` over SSH from a mobile terminal app (observed with Termius on Android) dies instantly with `zsh: illegal hardware instruction`. It happens in both a plain SSH shell and inside tmux, at any terminal size. The same setup works fine:
- locally in a desktop terminal,
- over other SSH clients (e.g. ConnectBot).

## What's actually happening

macOS crash reports (`~/Library/Logs/DiagnosticReports/opencode-*.ips`) show:

```
exception: EXC_BAD_INSTRUCTION  signal: SIGILL
termination: Illegal instruction: 4
faultingThread: 0
```

The fault is on the **main thread inside the opencode binary** — a Bun/JavaScriptCore **JIT code-generation crash**. It fires only in a startup code path reached when the TUI probes the terminal's capabilities, and only some clients (Termius) respond in a way that triggers it. It is not the SSH connection, not tmux, not the machine's config, and not an architecture mismatch.

Diagnostics that came back clean: the byte stream, terminal size, `TERM`, keymap bindings, and a plain `ssh` to the same host. The crashing processes die before writing any log line.

## Fix

**Use a different SSH client.** We keep Termius for general terminal use, but for opencode we connect through **ConnectBot** (free, open source) — it runs opencode without issue, confirmed.

Other workarounds that avoid the crashing code path entirely:

```bash
# skip plugin loading (different startup path)
opencode --pure

# headless server + web UI — no terminal TUI at all
opencode web --hostname 0.0.0.0 --port 4096
```

## Upstream

Filed as [anomalyco/opencode#41497](https://github.com/anomalyco/opencode/issues/41497) with the `.ips` crash reports.
