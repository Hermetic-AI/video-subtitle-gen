# End-to-End Examples

Full pipeline examples from user description to finished subtitles.

## Example 1: From scratch (most common)

User describes a video topic. Agent writes script + converts to subtitles.

**Step 1 — Agent writes `voiceover-script.md`:**

```markdown
---
title: How I Automated My Morning Routine
platform: TikTok / YouTube Shorts
tone: casual, conversational
---

## Storyboard Table

| # | Visual | Narration | Est. |
|---|--------|-----------|------|
| 1 | Alarm clock, phone glowing | Here is how I automated my morning routine | ~5s |
| 2 | Calendar + task list | A script pulls my calendar and picks today's top 3 | ~7s |
| 3 | Coffee machine turning on | My coffee starts brewing before I even wake up | ~6s |

## One-Line Narration

Here is how I automated my morning routine
a script pulls my calendar
and picks today's top 3 things【pause】
my coffee starts brewing
before I even wake up【pitch】
```

**Step 2 — Run CLI:**

```bash
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SKILL_DIR/cli.mjs" --file voiceover-script.md --out ./out
```

**Output:**
```
OUT: ./out/voiceover-script.srt
OUT: ./out/voiceover-script.lrc
OUT: ./out/voiceover-script.ass
✓ 5 subtitles · estimated total 22.1s
```

## Example 2: Recalibrate after recording

User recorded the voiceover, real length is 19s. Re-run with `--total`:

```bash
node "$SKILL_DIR/cli.mjs" --file voiceover-script.md --out ./out --total 19
```

Timing is now proportionally split across 19s.

## Example 3: Extract from storyboard table

User has a storyboard table but no separate narration section. Use `--col` to extract column 2 (0-based):

```bash
node "$SKILL_DIR/cli.mjs" --file storyboard.md --out ./out --col 2 --total 45
```

## Example 4: Anchored calibration

User knows line 1 starts at 0s and line 5 at 20s. Add anchors + `--total`:

```markdown
[00:00] Here is how I automated my morning routine
a script pulls my calendar
and picks today's top 3 things
my coffee starts brewing
[00:20] before I even wake up
```

```bash
node "$SKILL_DIR/cli.mjs" --file script-anchored.md --out ./out --total 45
```

## Example 5: Text literal input

Skip the file, pass text directly:

```bash
node "$SKILL_DIR/cli.mjs" --text "First line of narration" --out ./out
```

## Two-pass workflow (recommended)

1. **Draft** — run without `--total` to get estimated duration
2. **Record** — use the draft subtitles as a guide
3. **Calibrate** — re-run with `--total <real recording length>`

This gives you precise timing that matches your actual voice.
