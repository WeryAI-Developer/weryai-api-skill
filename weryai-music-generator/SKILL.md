---
name: weryai-music-generator
description: Generate WeryAI music, vocal songs, or instrumental tracks through the WeryAI music API. Use when you need music generation, song generation, instrumental generation, lyrics-aware vocal songs, reference-audio guided music, dry-run payload previews, music task status polling, or balance checks.
metadata: { "openclaw": { "emoji": "🎵", "primaryEnv": "WERYAI_API_KEY", "paid": true, "network_required": true, "requires": { "env": ["WERYAI_API_KEY"], "bins": ["node"], "node": ">=18" } } }
---

# WeryAI Music Generator

Generate WeryAI music with the official base skill for vocal-song and music-only workflows. This API is mode-driven rather than model-driven, so the main choice is whether the user wants a `VOCAL_SONG` or `ONLY_MUSIC` result.

## Example Prompts

- `Generate an instrumental ambient track and show me the final audio URL.`
- `Make a vocal pop song with warm female vocals and custom lyrics.`
- `Turn this style brief into a piano-only meditation track and preview the request body first.`
- `Generate a song from this reference audio URL and tell me when the audio, lyrics, and cover are ready.`
- `Check the status of my WeryAI music generation task and tell me whether the results are ready.`

## Quick Summary

- Main jobs: `music generation`, `song generation`, `instrumental generation`, `task status`
- Main modes: `ONLY_MUSIC`, `VOCAL_SONG`
- Default mode: `VOCAL_SONG`
- Default options: `genre=none`, `emotion=none`, `instrument=none`, `timbre=male`
- Main trust signals: dry-run support, paid-run warning, explicit mode rules, public URL validation for `reference_audio`

## Authentication and first-time setup

Before the first real generation run:

1. Create a WeryAI account.
2. Open the API key page at `https://www.weryai.com/api/keys`.
3. Create a new API key and copy the secret value.
4. Add it to the required environment variable `WERYAI_API_KEY`.
5. Make sure the WeryAI account has available balance or credits before paid generation.

### OpenClaw-friendly setup

- This skill already declares `WERYAI_API_KEY` in `metadata.openclaw.requires.env` and `primaryEnv`.
- After installation, if the installer or runtime asks for required environment variables, paste the key into `WERYAI_API_KEY`.
- If you are configuring the runtime manually, export it before running commands:

```sh
export WERYAI_API_KEY="your_api_key_here"
```

### Quick verification

Use one safe check before the first paid run:

```sh
node {baseDir}/scripts/balance-music.js
node {baseDir}/scripts/wait-music.js --json '{"type":"VOCAL_SONG","description":"A calm pop sketch","gender":"m"}' --dry-run
```

- `balance-music.js` confirms that the key is configured and the account is reachable.
- `--dry-run` confirms the request shape locally without spending credits.
- Real `wait` or `submit` commands still require available WeryAI balance.

## Prerequisites

- `WERYAI_API_KEY` must be set before paid runs.
- Node.js `>=18` is required because the runtime uses built-in `fetch`.
- `reference_audio` and `webhook_url` must be public `http` or `https` URLs. Use a real reference audio URL, not a local file path.
- Real `submit` and `wait` runs consume WeryAI credits.

## Security And API Hosts

- Keep `WERYAI_API_KEY` secret and never write it into the repository.
- Optional override `WERYAI_BASE_URL` defaults to `https://api.weryai.com`. Only override it with a trusted host.
- Review `scripts/` before production use if you need higher assurance.

## Supported Intents

- Generic music request -> default to `ONLY_MUSIC`.
- Song, vocals, lyrics, singer, male/female voice -> use `VOCAL_SONG`.
- Reference audio request -> add `reference_audio` and require `audio_name`.
- Existing task -> check status instead of creating a new paid job.
- Account question -> check balance before running a paid task.

## Default Configuration

Unless the user explicitly changes them, prefer:

- `type`: `VOCAL_SONG`
- `timbre`: `male` (`gender: m`)
- `description`: required unless `styles` is sufficient
- `genre`: none
- `emotion`: none
- `instrument`: none

Switch to `ONLY_MUSIC` when the user clearly asks for instrumental-only output, background music, soundtrack, ambience, BGM, or no vocals.

## Supported Option Sets

Use these grouped options when the user wants structured controls instead of a freeform description.

### Music Type

- `VOCAL_SONG`
- `ONLY_MUSIC`

Default: `VOCAL_SONG`

### Genre Options

- `POP`
- `ROCK`
- `RAP`
- `ELECTRONIC`
- `RNB`
- `JAZZ`
- `FOLK`
- `CLASSIC`
- `WORLD`

Default: none

### Emotion Options

- `HAPPY`
- `RELAXED`
- `WARM`
- `ROMANTIC`
- `TOUCHING`
- `SAD`
- `LONELY`
- `DEPRESSED`
- `TENSE`
- `EXCITED`
- `EPIC`
- `MYSTERIOUS`

Default: none

### Instrument Options

- `PIANO`
- `GUITAR`
- `BASS`
- `DRUMS`
- `STRINGS`
- `WIND`
- `SYNTHESIZER`
- `ELECTRONIC_SOUND`
- `FOLK_INSTRUMENT`
- `MIXED_ORCHESTRATION`

Default: none

### Timbre Options

- `male`
- `female`

Default: `male`

## Mode And Parameter Guidance

Guide the user progressively instead of asking for every music field up front.

- If the user simply asks for music without clarifying, start from the default `VOCAL_SONG` mode.
- If the user clearly wants background music, soundtrack, ambience, meditation music, BGM, or instrumental audio, switch into `ONLY_MUSIC`.
- If the user asks for a song, vocals, lyrics, or singer gender, stay in `VOCAL_SONG`.
- If the user already provides lyrics, `gender`, or explicit vocal intent, use that directly and do not re-ask the same thing.
- If the user sounds unsure, translate their creative request into the closest valid mode and style tags rather than exposing raw API vocabulary too early.

### Recommended guidance pattern

Use short operator-style guidance like this:

- Default run:
  `I can start with the default setup: vocal-song generation, male timbre, no fixed genre/emotion/instrument tags. If you want pure instrumental music, a different timbre, or specific tags, I can switch that before submission.`
- Vocal switch:
  `If you want a song instead of instrumental music, tell me whether you want custom lyrics, the singer gender, or just a general vocal style, and I will route it as a vocal-song request.`
- Parameter changes:
  `I can map your request into music settings. For example: pure instrumental background music -> ONLY_MUSIC, full song with lyrics -> VOCAL_SONG, pop + warm + piano -> genre/emotion/instrument tags, female voice -> timbre=female, style reference clip -> reference_audio + audio_name.`
- Safety before paid runs:
  `Before I submit a paid task, I will show the final mode, key fields, and prompt so you can confirm them.`

### When to ask follow-up questions

Ask only for the smallest missing detail needed to submit safely.

- Ask whether the user wants vocals only if the request is ambiguous between song and instrumental.
- Ask for `lyrics` only when the user wants a vocal song and has not already provided lyric direction.
- Ask for `gender` / `timbre` only when the user cares about male vs female vocals. Otherwise keep the default male timbre.
- Ask for `audio_name` only when the user provides `reference_audio`.
- Do not ask every question if a valid request can already be formed from the user's brief.

### Map user language to modes and fields

Use these common mappings:

- `instrumental`, `background music`, `soundtrack`, `ambient track`, `piano piece`, `meditation music` -> `type: ONLY_MUSIC`
- `song`, `vocal song`, `singing`, `lyrics`, `male vocals`, `female vocals` -> `type: VOCAL_SONG`
- `use this reference track`, `match this demo`, `follow this audio sample` -> `reference_audio` + `audio_name`
- `make it pop`, `rock`, `jazz`, `epic`, `warm`, `piano`, `strings` -> convert into supported `styles` keys from `references/api-music.md`
- `genre`, `emotion`, `instrument`, `timbre` -> accept direct option values and normalize them into API `styles` / `gender`

### Confirmation block before submission

Before a paid run, show a concise confirmation block with the final payload choices.

```md
Ready to generate

- type: `VOCAL_SONG`
- description: `A warm cinematic pop song with emotional build and polished production`
- timbre: `male`
- gender: `m`
- lyrics: `custom lyrics provided`
- genre: `POP`
- emotion: `WARM`
- instrument: `PIANO`
- reference_audio: `none`
```

Wait for confirmation or requested edits before running a paid submission.

## Intent Routing

Use `wait-music.js` as the default one-shot entry point when the user wants final audio URLs.

- If the request is instrumental or generic background music, route to `ONLY_MUSIC`.
- If the request is for a song, vocals, lyrics, singer gender, or timbre, route to `VOCAL_SONG`.
- If the user already has `taskId`, use `status-music.js` instead of creating a new task.
- If the user wants to check account readiness first, use `balance-music.js`.

## Preferred Commands

```sh
# Default: submit and wait for final music URLs
node {baseDir}/scripts/wait-music.js \
  --json '{"description":"A calm ambient piano track"}'

# Vocal song
node {baseDir}/scripts/wait-music.js \
  --json '{"type":"VOCAL_SONG","description":"A warm pop song","gender":"f","styles":{"POP":"pop","WARM":"warm"}}'

# Instrumental music
node {baseDir}/scripts/wait-music.js \
  --json '{"type":"ONLY_MUSIC","styles":{"CLASSIC":"classical","PIANO":"piano"}}'

# Structured option inputs
node {baseDir}/scripts/wait-music.js \
  --json '{"description":"A bright pop single","genre":"POP","emotion":"HAPPY","instrument":"PIANO","timbre":"female"}'

# Dry-run preview without spending credits
node {baseDir}/scripts/submit-music.js \
  --json '{"type":"ONLY_MUSIC","description":"A calm piano piece"}' \
  --dry-run

# Submit without waiting
node {baseDir}/scripts/submit-music.js \
  --json '{"type":"VOCAL_SONG","description":"An energetic rock anthem","styles":{"ROCK":"rock","EXCITED":"excited"}}'

# Query task status or remaining balance
node {baseDir}/scripts/status-music.js --task-id <task-id>
node {baseDir}/scripts/balance-music.js
```

## Workflow

1. Identify whether the user wants a vocal song or music-only output. If unclear, default to `VOCAL_SONG`.
2. Build the request with at least one of `description` or `styles`.
3. Normalize `genre`, `emotion`, `instrument`, and `timbre` into valid API fields when the user supplies structured options.
4. If the request includes `reference_audio`, also provide `audio_name`.
5. Use `submit --dry-run` when you need to verify the payload before spending credits.
6. Use `submit` if the user only wants task creation, or `wait` if they want the final result in one pass.
7. Use `status` to re-check an existing task without creating a new paid task.

## Input Rules

- `type` must be `VOCAL_SONG` or `ONLY_MUSIC`.
- At least one of `description` or `styles` must be present.
- For `ONLY_MUSIC`, do not send `lyrics` or `gender`.
- `genre`, `emotion`, and `instrument` option fields are normalized into `styles`.
- `timbre` is normalized into `gender` and is only valid for `VOCAL_SONG`.
- Only use style keys that exist in [references/api-music.md](references/api-music.md).
- Do not invent undocumented fields.

## Output

All commands print JSON to stdout. Successful result objects can include:

- `taskId` and `taskStatus`
- `audios`
- `lyrics`
- `coverUrl`
- `balance`
- `errorCode` and `errorMessage`

See [references/error-codes.md](references/error-codes.md) for the common error classes and recovery hints.

## Definition Of Done

The task is done when:

- the request is validated locally without CLI-side errors,
- the API returns a task ID for `submit`,
- or `wait` reaches a terminal result with at least one audio URL,
- or `status` returns a clear terminal or in-progress state for the target task,
- and the response tells the user whether lyrics and cover art are present.

## Constraints

- Do not pretend this music API supports dynamic model discovery; it is mode-driven and documentation-based.
- Do not use local file paths for `reference_audio`.
- Do not re-run `submit` or `wait` casually, because each re-run creates a new paid task.
- Do not broaden this skill into general audio editing, DAW automation, or file mastering workflows.

## Re-run Behavior

- `submit` is not idempotent; re-running it creates a new paid task.
- `wait` is not idempotent for the same reason: it submits first, then polls.
- `status` is safe to re-run for the same task ID.

## References

- Field rules and style enums: [references/api-music.md](references/api-music.md)
- Error handling guidance: [references/error-codes.md](references/error-codes.md)
