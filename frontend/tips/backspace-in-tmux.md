# Backspace broken in tmux (Termius on Android)

**Symptom:** backspace deletes fine in a plain SSH shell, but inside `tmux` it does nothing — or even inserts a space and moves the cursor right. Observed when connecting from the Termius app on Android.

## What's actually happening

Most of the time nothing is wrong with the byte being sent. The phone's backspace key sends `0x7f` (DEL), tmux forwards it to the pane, and zsh's keymap maps it to delete. The breakage is in the **terminal state of the pane**: it gets stuck in a degraded mode (e.g. leftover from an earlier `stty raw`), and zsh's line editor no longer processes the key.

A second, subtler cause: tmux's pane `TERM` is set from `default-terminal`. If that value has **no terminfo entry installed** on the machine (e.g. `tmux-256color` on a stock macOS), the line editor can't initialize cleanly.

## Diagnose in three commands

Run these inside the broken tmux pane:

```bash
# 1. What byte does backspace actually send? (expect 127 = 0x7f)
read -k 1 c && print -r -- $((#c))

# 2. Is the key mapped to delete?
bindkey -M main '^?'; bindkey -M main '^H'

# 3. What's the terminal's erase character?
stty -a | grep erase
```

If the byte is `127` and the bindings say `backward-delete-char`, the keys are fine — the pane state is the problem.

## Fix

**Fastest:** reset the pane's terminal state.

```bash
reset
```

If it asks `Terminal type?`, answer with a valid one (e.g. `xterm-256color`). Then backspace works immediately.

**If it keeps happening:** kill tmux and start clean — a fresh pane is never affected.

```bash
tmux kill-server && tmux new -s main
```

## Prevention

Give tmux a `default-terminal` that actually exists on the host, and teach it that the client sends `^?` for backspace. In `~/.tmux.conf`:

```
set -g terminal-overrides ",*:kbs=^?"
set -g default-terminal "screen-256color"
```

Then reload with `tmux source-file ~/.tmux.conf` (restart existing sessions with `tmux kill-server`).

## The rule of thumb

- **Byte wrong?** Fix the client (keyboard/Termius settings) or the erase char (`stty erase '^?'`).
- **Byte right, still broken?** Reset the pane (`reset`) or start a fresh one — never fight a corrupted pane.
- **Avoid** running `stty raw` in a tmux pane without restoring it (`stty sane`) when you're done.
