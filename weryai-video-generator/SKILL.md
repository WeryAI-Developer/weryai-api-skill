---
name: weryai-video-generator
description: Generate WeryAI videos from text, images, storyboard frames, or first-frame and last-frame guidance. Use when you need text-to-video, image-to-video, video from image, storyboard-to-video, first-frame to last-frame transition video, Seedance 2.0 video generation, model switching, dry-run payload previews, or WeryAI video task status checks.
metadata: { "openclaw": { "emoji": "🎬", "primaryEnv": "WERYAI_API_KEY", "paid": true, "network_required": true, "requires": { "env": ["WERYAI_API_KEY"], "bins": ["node"], "node": ">=18" } } }
---

# WeryAI Video Generator

Generate WeryAI videos with the official base skill for text-to-video, image-to-video, video from image, storyboard-to-video, and first-frame/last-frame transition workflows. It defaults to `SEEDANCE_2_0` with `5s`, `720p`, `9:16`, and `generate_audio=false`, while still allowing custom models and parameters.

## Example Prompts

- `Make a video from this prompt with Seedance 2.0 and show me the final video URL.`
- `Turn this image into a video with subtle motion and keep the subject consistent.`
- `Generate a transition video from this first frame to this last frame.`
- `Turn these storyboard frames into one coherent product reveal video.`
- `Check which WeryAI video model supports 10 seconds, 16:9, and audio before submitting.`

## Quick Summary

- Main jobs: `text-to-video`, `image-to-video`, `video from image`, `first-frame to last-frame video`, `storyboard-to-video`, `task status`
- Default model: `SEEDANCE_2_0`
- Default parameters: `duration=5`, `resolution=720p`, `aspect_ratio=9:16`, `generate_audio=false`
- Main trust signals: dry-run support, model capability lookup, paid-run warning, HTTPS image validation

## Prerequisites

- `WERYAI_API_KEY` must be set before paid runs.
- Node.js `>=18` is required because the runtime uses built-in `fetch`.
- Every reference image must be a public `https` URL.
- Real `submit` and `wait` commands consume WeryAI credits.

## Security And API Hosts

- Keep `WERYAI_API_KEY` secret and never write it into the repository.
- Optional overrides `WERYAI_BASE_URL` and `WERYAI_MODELS_BASE_URL` default to `https://api.weryai.com` and `https://api-growth-agent.weryai.com`. Only override them with trusted hosts.
- Review `scripts/` before production use if you need higher assurance.

## Supported Intents

- Text brief -> generate a video from scratch.
- One reference image -> animate the source image into a video.
- Start frame + end frame -> generate a controlled transition video.
- Multiple ordered images -> turn a storyboard or shot sequence into one video.
- Existing task -> check status instead of creating a new paid job.
- Parameter or model questions -> inspect `models` first, then submit.

## Default Configuration

Unless the user explicitly changes them, prefer:

- `model`: `SEEDANCE_2_0`
- `duration`: `5`
- `resolution`: `720p`
- `aspect_ratio`: `9:16`
- `generate_audio`: `false`

Always allow the user to override `model`, `duration`, `resolution`, `aspect_ratio`, and `generate_audio`. When the user asks for unsupported settings, check `models-video.js` and keep only values supported by the chosen model.

## Model Switching And Parameter Guidance

Guide the user progressively instead of explaining every parameter up front.

- If the user only wants a video, proceed with the default `SEEDANCE_2_0` configuration.
- If the user asks for a different model, better quality, stronger motion, longer duration, landscape output, vertical output, or generated audio, switch into parameter-confirmation mode.
- If the user already knows the exact parameter they want, apply it directly and only validate model support when needed.
- If the user sounds unsure, translate their creative request into the closest supported parameters rather than asking them to choose raw API fields.

### Recommended guidance pattern

Use short operator-style guidance like this:

- Default run:
  `I can start with the default setup: SEEDANCE_2_0, 5s, 720p, 9:16, no audio. If you want, I can also switch the model or adjust the duration, aspect ratio, resolution, or audio before submission.`
- Model switching:
  `If you want a different model, tell me whether you care more about image quality, motion performance, start/end-frame control, multi-image support, or cost/speed, and I will check the supported models first.`
- Parameter changes:
  `I can map your request into video settings. For example: vertical short video -> 9:16, landscape -> 16:9, longer clip -> 10s or 15s, add ambience -> generate_audio=true.`
- Safety before paid runs:
  `Before I submit a paid task, I will show the final model, parameters, and prompt so you can confirm them.`

### When to ask follow-up questions

Ask only for the smallest missing detail needed to submit safely.

- Ask about `aspect_ratio` when the user implies platform intent such as TikTok, Reels, YouTube Shorts, or landscape trailer.
- Ask about `duration` when the user asks for a longer clip or a slower beat.
- Ask about `generate_audio` only when the user mentions ambience, sound, music, or voice-like atmosphere.
- Ask about model choice only when the user explicitly wants a different model or when capability support is uncertain.
- Do not ask every parameter question if the default configuration already fits the request.

### Map user language to parameters

Use these common mappings:

- `vertical`, `portrait`, `short video`, `TikTok`, `Reels`, `Shorts` -> `aspect_ratio: 9:16`
- `square` -> `aspect_ratio: 1:1`
- `landscape`, `widescreen`, `YouTube`, `cinematic frame` -> `aspect_ratio: 16:9`
- `make it longer`, `slower pacing` -> increase `duration` to a supported value such as `10` or `15`
- `make it clearer`, `higher quality` -> use the highest supported `resolution` for the chosen model
- `add ambient sound`, `with audio` -> `generate_audio: true`
- `use another model`, `not Seedance`, `check supported models` -> run `models-video.js` before submission

### Model lookup workflow

When the user asks to change the model or requests parameters that may be unsupported:

1. Identify the intended mode: `text_to_video`, `image_to_video`, or `multi_image_to_video`.
2. Run the matching `models-video.js` command first.
3. Keep only supported values for `duration`, `aspect_ratio`, `resolution`, and audio support.
4. If multiple models fit, recommend one concise default instead of dumping raw metadata unless the user asked for a comparison.
5. If support is unclear, say so explicitly and use `--dry-run` or a safe model query before the paid call.

### Confirmation block before submission

Before a paid run, show a concise confirmation block with the final payload choices.

```md
Ready to generate

- mode: `image-to-video`
- model: `SEEDANCE_2_0`
- duration: `5`
- resolution: `720p`
- aspect_ratio: `9:16`
- generate_audio: `false`
- image: `https://example.com/input.png`
- prompt: `Animate this portrait with subtle hair and fabric motion, preserve identity, keep the composition stable, soft side lighting, gentle camera drift, clean final hold on the face.`
```

Wait for confirmation or requested edits before running a paid submission.

## Intent Routing

Use `wait-video.js` as the default one-shot entry point when the user wants finished video URLs.

- If the user provides only `prompt`, route to text-to-video.
- If the user provides `image`, route to image-to-video.
- If the user provides `first_frame` + `last_frame`, or `image` + `last_image`, normalize them into ordered `images` and route to the guided multi-image flow.
- If the user provides `images`, route to multi-image-to-video.
- If multi-image support is unavailable for the chosen model, the runtime may downgrade to image-to-video with the first image only.
- If the user already has `taskId` or `batchId`, use `status-video.js` instead of creating a new task.

## Preferred Commands

```sh
# Default: submit and wait for final video URLs
node {baseDir}/scripts/wait-video.js \
  --json '{"prompt":"A neon city flythrough at night","duration":5}'

# Animate one image
node {baseDir}/scripts/wait-video.js \
  --json '{"prompt":"Animate this portrait with subtle hair and fabric motion","image":"https://example.com/input.png","duration":5}'

# First frame + last frame guided generation
node {baseDir}/scripts/wait-video.js \
  --json '{"prompt":"Start on the first frame and transition naturally to the last frame","first_frame":"https://example.com/start.png","last_frame":"https://example.com/end.png","duration":5}'

# Compatibility alias for end-frame workflows
node {baseDir}/scripts/wait-video.js \
  --json '{"prompt":"Transition from the start image to the end image","image":"https://example.com/start.png","last_image":"https://example.com/end.png","duration":5}'

# Multi-image storyboard generation
node {baseDir}/scripts/wait-video.js \
  --json '{"prompt":"Turn these storyboard frames into one coherent reveal shot","images":["https://example.com/1.png","https://example.com/2.png","https://example.com/3.png"],"duration":5}'

# Dry-run preview without spending credits
node {baseDir}/scripts/wait-video.js \
  --json '{"prompt":"A paper crane unfolds into a real bird","duration":5}' \
  --dry-run

# Submit without waiting
node {baseDir}/scripts/submit-text-video.js \
  --json '{"prompt":"A drone shot over snowy mountains","duration":5}'

# Inspect models, poll status, or check balance
node {baseDir}/scripts/models-video.js --mode text_to_video
node {baseDir}/scripts/models-video.js --mode image_to_video
node {baseDir}/scripts/models-video.js --mode multi_image_to_video
node {baseDir}/scripts/status-video.js --task-id <task-id>
node {baseDir}/scripts/balance-video.js
```

## Workflow

1. Identify the user's intent: text-only, single-image, first/last-frame, multi-image, status lookup, or model lookup.
2. Collect `prompt` and, if needed, ordered public `https` image URLs.
3. Apply defaults: `SEEDANCE_2_0`, `5s`, `720p`, `9:16`, `generate_audio=false`, unless the user asks otherwise.
4. If the user wants a custom model or non-default parameters, run `models-video.js` first when support is uncertain.
5. Use `--dry-run` when you need to preview the final payload before a paid submission.
6. Use `wait-video.js` when the user wants the final video URLs now.
7. Use `submit-*` only when the user explicitly wants task creation without polling.
8. Use `status-video.js` to re-check an existing task or batch safely.

## Input Rules

- `prompt` and `duration` are required for every generation mode.
- `image`, `images`, `first_frame`, `last_frame`, and `last_image` must be public `https` URLs.
- If both `images` and `image` are provided, `images` wins during mode detection.
- `first_frame` + `last_frame` and `image` + `last_image` are accepted aliases for start/end-frame intent.
- Only send `aspect_ratio`, `resolution`, `negative_prompt`, or `generate_audio` when supported by the selected model.
- Do not invent undocumented fields.

## Output

All commands print JSON to stdout. Successful results can include:

- `taskId`, `taskIds`, `batchId`
- `taskStatus`
- `videos`
- `balance`
- `errorCode`, `errorMessage`

See [references/error-codes.md](references/error-codes.md) for common failure classes and recovery hints.

## Definition Of Done

The task is done when:

- local validation passes without CLI-side errors,
- `submit-*` returns a valid task ID or batch ID,
- or `wait-video.js` reaches a terminal result with at least one playable video URL,
- or `status-video.js` returns a clear in-progress or terminal state,
- and the output makes it explicit whether video URLs are present.

## Constraints

- Do not assume every model supports every parameter.
- Do not use local file paths for reference images.
- Do not re-run `submit` or `wait` casually because each run can create a new paid task.
- Do not broaden this skill into general video editing outside the documented WeryAI API surface.

## Re-run Behavior

- `submit-text-video.js`, `submit-image-video.js`, and `submit-multi-image-video.js` are not idempotent.
- `wait-video.js` is also not idempotent because it submits first and then polls.
- `status-video.js`, `models-video.js`, and `balance-video.js` are safe to re-run.

## References

- Model metadata and parameter rules: [references/api-models.md](references/api-models.md)
- Error handling guidance: [references/error-codes.md](references/error-codes.md)
