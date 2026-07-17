---
name: video-subtitle-gen
description: End-to-end video voiceover subtitle generation. From a user's short description, first generate a voiceover script (storyboard table + one-line-per-sentence narration .md as the intermediate artifact), then convert the .md into SRT / LRC / ASS subtitle files in one shot. Time allocation by character count: without --total it estimates by speaking rate (cps); with --total (real recording seconds) it proportionally splits the total duration. Supports extracting narration from a storyboard table column, per-line timecode anchors [mm:ss], and inline [pause] markers. Use when the user wants video narration / voiceover subtitles, describes a video topic or product and says "generate subtitles", "convert to SRT", "voiceover script", "narration script", or "make a video voiceover subtitle script for xxx".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
argument-hint: "[--file <path> | --text <string>] [--out <dir>] [--total <sec>] [--format all|srt|lrc|ass] [--cps 4.5] [--col <n>] [--title <str>]"
---

# video-subtitle-gen

End-to-end video voiceover subtitle generation. From a user's short description, **produce in one pass**:

```
User description ──→ voiceover-script.md ──→ SRT / LRC / ASS subtitles
                    (intermediate artifact)    (final artifacts)
                    ├ storyboard table         └ auto time allocation
                    └ one-line narration
```

**Saves video creators**: writing the script + typing every subtitle by hand + adjusting timing — three jobs become one.

## TL;DR

```bash
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
# 1. Agent writes voiceover-script.md (storyboard table + one-line narration)
# 2. Convert to subtitles:
node "$SKILL_DIR/cli.mjs" --file voiceover-script.md --out ./out
# → OUT: ./out/voiceover-script.srt / .lrc / .ass
# → ✓ 14 subtitles · estimated total 58.3s
```

## Pipeline

### Phase 1 — Write the voiceover script (.md)

When the user describes a video topic, write a `.md` with two sections:

**Storyboard table** (for structure review):

| # | Visual | Narration | Est. |
|---|--------|-----------|------|
| 1 | App dashboard | Here is how I automated my morning routine | ~6s |
| 2 | Calendar view | A script pulls my calendar and picks today's top 3 | ~9s |

**One-line narration** (one line per sentence, fed to CLI):

```
Here is how I automated my morning routine
a script pulls my calendar
and picks today's top 3【pause】
```

Both sections live in the **same .md**. The CLI auto-filters table/heading/tag noise, keeping only the narration. See [writing-guide.md](docs/writing-guide.md) for details.

### Phase 2 — Convert to subtitles

```bash
node <SKILL_DIR>/cli.mjs --file voiceover-script.md --out ./out
```

`<SKILL_DIR>` = directory containing this SKILL.md. See [cli-reference.md](docs/cli-reference.md) for all flags.

## Agent workflow

### Scenario A: user describes a video topic (most common)

1. **Understand the ask** — extract topic, platform, vibe, duration preference.
2. **Write voiceover-script.md** — storyboard table + one-line narration (split by sense group, add `【pause】` at breath points).
3. **Run CLI** without `--total` first, read estimated duration from stdout.
4. **Tell user how to calibrate** — import into editing app and align, or report real length and re-run with `--total`.
5. **(Optional) Recalibrate** — re-run with `--total <real seconds>` for precise timing.
6. **Verify** — read back first file, confirm no garbled text and line count matches.
7. **Hand back paths** — return `OUT:` lines + intermediate `.md` path.

### Scenario B: user already has a script / storyboard

- One-line narration → feed CLI directly
- Storyboard table only → use `--col <n>` to extract narration column
- Both → feed CLI directly (auto-filters table)

### Scenario C: recalibrate only

Re-run CLI with `--total <seconds>`, no `.md` changes.

## Key gotchas

- **Timing is a draft, not auto lip-sync.** Always finalize with `--total <real recording length>`.
- **Pause markers only work in estimate mode.** Precise mode (`--total`) ignores them.
- **Anchors require `--total`.** Must be strictly increasing and inside `(0, total)`.
- **CJK + Latin mix estimates are off.** Calibrate with `--total` at the end.
- **ASS has no BOM** (must start with `[Script Info]`). SRT/LRC carry BOM for CJK.

## File structure

```
video-subtitle-gen/
├── SKILL.md                    ← this file (entry point)
├── cli.mjs                     ← CLI (zero-dep, pure Node)
├── install.mjs                 ← one-click install
├── README.md                   ← GitHub-facing
├── docs/
│   ├── writing-guide.md        ← script writing tips
│   ├── cli-reference.md        ← all flags + examples
│   └── examples.md             ← end-to-end examples
└── example/
    ├── voiceover-demo.md
    └── out/                    ← verified output
```

## Quick install

```bash
node install.mjs
```

Or manually: clone/copy this folder into `~/.claude/skills/`.

No `npm install`, no build step. Just `node cli.mjs`.
