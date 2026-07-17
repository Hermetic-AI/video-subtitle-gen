# video-subtitle-gen

End-to-end video voiceover subtitle generation. From a short description, generate a voiceover script and convert it into SRT / LRC / ASS subtitle files — one command, three formats, auto timing.

## What it does

```
Your description → voiceover-script.md → SRT / LRC / ASS subtitles
                  (intermediate artifact)   (auto time allocation)
```

**Saves video creators**: writing the script + typing every subtitle by hand + adjusting timing — three jobs become one.

## Quick install

### Option 1: One-click install

```bash
git clone https://github.com/Hermetic-AI/video-subtitle-gen.git
cd video-subtitle-gen
node install.mjs
```

The installer auto-detects your Claude skills directory and copies the skill there.

### Option 2: Manual

Copy this folder into `~/.claude/skills/`:

```bash
cp -r video-subtitle-gen ~/.claude/skills/
```

### Option 3: Tell your agent

```
Install the video-subtitle-gen skill from https://github.com/Hermetic-AI/video-subtitle-gen
```

## Quick start

### Let the agent do everything

Tell your agent:

> "Generate video voiceover subtitles for [your video topic]"

The agent writes the script and converts it to subtitles automatically.

### Run the CLI directly

```bash
# Draft estimate (auto timing)
node cli.mjs --file voiceover-script.md --out ./out

# Calibrate with real recording length
node cli.mjs --file voiceover-script.md --out ./out --total 58

# SRT only
node cli.mjs --file voiceover-script.md --out ./out --format srt
```

### Input format

Create a `.md` file with one line per sentence:

```
Here is how I automated my morning routine
a script pulls my calendar
and picks today's top 3【pause】
```

The `【pause】` marker adds a breath pause and is stripped from the subtitle text.

## Features

- **Three formats**: SRT (video), LRC (lyrics), ASS (advanced) — one command, all three
- **Auto timing**: allocates duration by character count and speaking rate
- **Recording calibration**: re-run with `--total <seconds>` for precise timing
- **Timecode anchors**: pin specific lines with `[mm:ss]` for per-segment calibration
- **Storyboard extraction**: pull narration from a table column with `--col <n>`
- **Zero dependencies**: pure Node, no `npm install`

## CLI flags

| Flag | Description |
|------|-------------|
| `--file <path>` | Input file |
| `--text <string>` | Input text literal |
| `--out <dir>` | Output directory (default `./out`) |
| `--format <f>` | `srt` / `lrc` / `ass` / `all` |
| `--total <sec>` | Target total duration (calibrate with real recording) |
| `--cps <float>` | Speaking rate, chars/sec (default 4.5) |
| `--col <n>` | Extract narration from storyboard column n |
| `--font <name>` | ASS font |
| `--fontsize <int>` | ASS font size |
| `--help` | Show help |
| `--version` | Show version |

See [docs/cli-reference.md](docs/cli-reference.md) for full reference.

## Documentation

| Document | Content |
|----------|---------|
| [SKILL.md](SKILL.md) | Skill entry point, agent workflow, gotchas |
| [docs/writing-guide.md](docs/writing-guide.md) | How to write voiceover scripts |
| [docs/cli-reference.md](docs/cli-reference.md) | All CLI flags + usage examples |
| [docs/examples.md](docs/examples.md) | End-to-end examples |

## Requirements

- Node.js 14+
- No external dependencies

## License

[Apache License 2.0](LICENSE)
