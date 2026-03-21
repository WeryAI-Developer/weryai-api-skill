---
name: weryai-image-generator
description: Generate WeryAI images from text prompts or reference images through the WeryAI image APIs. Use when you need text-to-image, image-to-image, image from prompt, restyle this image, reference-image generation, model switching, dry-run payload previews, WeryAI image model checks, or image task status polling.
metadata: { "openclaw": { "emoji": "🎨", "primaryEnv": "WERYAI_API_KEY", "requires": { "env": ["WERYAI_API_KEY"], "bins": ["node"], "node": ">=18" } } }
---

# WeryAI Image Generator

Generate WeryAI images with the official base skill for text-to-image and image-to-image workflows. It defaults to `WERYAI_IMAGE_2_0` with `image_number=1` and `aspect_ratio=9:16`, while still allowing the user to switch models and override image parameters when needed.

## Example Prompts

- `Make an image from this prompt with the default WeryAI model and wait for the final image URL.`
- `Turn this reference image into a cinematic poster and keep the subject recognizable.`
- `Restyle this image with WeryAI image-to-image and show me the request payload first.`
- `Check which WeryAI image models support 9:16 and 4 output images before generating.`
- `Poll my WeryAI image generation task and tell me whether the images are ready yet.`

## Quick Summary

- Main jobs: `text-to-image`, `image-to-image`, `image from prompt`, `restyle this image`, `task status`
- Default model: `WERYAI_IMAGE_2_0`
- Default parameters: `image_number=1`, `aspect_ratio=9:16`
- Main trust signals: dry-run support, model capability lookup, paid-run warning, HTTPS image validation

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
node {baseDir}/scripts/models-image.js --mode text_to_image
node {baseDir}/scripts/wait-image.js --json '{"prompt":"A glowing paper lantern in mist","aspect_ratio":"9:16"}' --dry-run
```

- `models-image.js` confirms that the key is configured and the models endpoint is reachable.
- `--dry-run` confirms the request shape locally without spending credits.
- Real `wait` or `submit-*` commands still require available WeryAI balance.

## Prerequisites

- `WERYAI_API_KEY` must be set before paid runs.
- Node.js `>=18` is required because the runtime uses built-in `fetch`.
- Reference images must be public `https` URLs. Do not pass local file paths.
- Real `submit` and `wait` runs consume WeryAI credits.

## Security And API Hosts

- Keep `WERYAI_API_KEY` secret and never write it into the repository.
- Optional overrides `WERYAI_BASE_URL` and `WERYAI_MODELS_BASE_URL` default to `https://api.weryai.com` and `https://api-growth-agent.weryai.com`. Only override them with trusted hosts.
- Review `scripts/` before production use if you need higher assurance.

## Supported Intents

- Text brief -> generate one or more images from scratch.
- One reference image -> restyle or transform that image.
- Existing task -> check image generation status instead of creating a new paid job.
- Parameter or model question -> inspect `models` first, then submit.

## Default Configuration

Unless the user explicitly changes them, prefer:

- `model`: `WERYAI_IMAGE_2_0`
- `image_number`: `1`
- `aspect_ratio`: `9:16`

Always allow the user to override `model`, `image_number`, `aspect_ratio`, and `resolution`. When the user asks for unsupported settings, run `models-image.js` and keep only values supported by the chosen model.

## Model Switching And Parameter Guidance

Guide the user progressively instead of explaining every parameter up front.

- If the user only wants an image, proceed with the default `WERYAI_IMAGE_2_0` configuration.
- If the user asks for a different model, better quality, more images, another aspect ratio, or a specific resolution, switch into parameter-confirmation mode.
- If the user already knows the exact parameter they want, apply it directly and only validate model support when needed.
- If the user sounds unsure, translate their creative request into the closest supported parameters rather than asking them to choose raw API fields.

### Recommended guidance pattern

Use short operator-style guidance like this:

- Default run:
  `I can start with the default setup: WERYAI_IMAGE_2_0, 1 image, 9:16. If you want, I can also switch the model or adjust the image count, aspect ratio, or resolution before submission.`
- Model switching:
  `If you want another model, tell me whether you care more about realism, stylization, reference-image fidelity, higher resolution, or output count, and I will check the supported models first.`
- Parameter changes:
  `I can map your request into image settings. For example: vertical cover -> 9:16, square post -> 1:1, more options -> image_number 4, clearer output -> the highest supported resolution for that model.`
- Safety before paid runs:
  `Before I submit a paid task, I will show the final model, parameters, and prompt so you can confirm them.`

### When to ask follow-up questions

Ask only for the smallest missing detail needed to submit safely.

- Ask about `aspect_ratio` when the user implies platform intent such as poster, cover image, wallpaper, square post, or vertical social card.
- Ask about `image_number` when the user wants multiple options or variations.
- Ask about `resolution` only when the user explicitly asks for higher quality or the target model supports multiple resolution tiers.
- Ask about model choice only when the user explicitly wants a different model or when capability support is uncertain.
- Do not ask every parameter question if the default configuration already fits the request.

### Map user language to parameters

Use these common mappings:

- `vertical`, `poster`, `cover image`, `mobile cover`, `social card` -> `aspect_ratio: 9:16`
- `square`, `avatar`, `icon`, `social post` -> `aspect_ratio: 1:1`
- `landscape`, `wide banner`, `wallpaper`, `hero image` -> choose a supported wide aspect ratio such as `16:9`
- `give me a few options`, `multiple versions`, `more variations` -> increase `image_number`
- `make it clearer`, `higher quality`, `higher resolution` -> use the highest supported `resolution` for the chosen model
- `use another model`, `check supported models`, `switch model` -> run `models-image.js` before submission

### Model lookup workflow

When the user asks to change the model or requests parameters that may be unsupported:

1. Identify the intended mode: `text_to_image` or `image_to_image`.
2. Run the matching `models-image.js` command first.
3. Keep only supported values for `image_number`, `aspect_ratio`, and `resolution`.
4. If multiple models fit, recommend one concise default instead of dumping raw metadata unless the user asked for a comparison.
5. If support is unclear, say so explicitly and use `--dry-run` or a safe model query before the paid call.

### Confirmation block before submission

Before a paid run, show a concise confirmation block with the final payload choices.

```md
Ready to generate

- mode: `image-to-image`
- model: `WERYAI_IMAGE_2_0`
- image_number: `1`
- aspect_ratio: `9:16`
- resolution: `default`
- image: `https://example.com/input.png`
- prompt: `Restyle this portrait into a cinematic editorial image, preserve facial identity, refined lighting, clean composition, premium color grading, polished final output.`
```

Wait for confirmation or requested edits before running a paid submission.

## Intent Routing

Use `wait-image.js` as the default one-shot entry point when the user wants final image URLs.

- If the user provides only `prompt`, route to text-to-image.
- If the user provides `image` or `images`, route to image-to-image.
- If the user already has `taskId` or `batchId`, use `status-image.js` instead of creating a new task.
- If the user asks about supported models or parameters, run `models-image.js` before any paid submission.

## Preferred Commands

```sh
# Default: submit and wait for final image URLs
node {baseDir}/scripts/wait-image.js \
  --json '{"prompt":"A refined editorial portrait"}'

# Image-to-image with a single reference image
node {baseDir}/scripts/wait-image.js \
  --json '{"prompt":"Turn this product shot into a cinematic ad image","image":"https://example.com/input.png"}'

# Image-to-image with explicit images array
node {baseDir}/scripts/wait-image.js \
  --json '{"prompt":"Restyle this image with premium lighting","images":["https://example.com/input.png"]}'

# Dry-run preview without spending credits
node {baseDir}/scripts/wait-image.js \
  --json '{"prompt":"A futuristic city skyline"}' \
  --dry-run

# Submit without waiting
node {baseDir}/scripts/submit-text-image.js \
  --json '{"prompt":"A sunset over the ocean"}'

# Inspect models, poll status, or check balance
node {baseDir}/scripts/models-image.js --mode text_to_image
node {baseDir}/scripts/models-image.js --mode image_to_image
node {baseDir}/scripts/status-image.js --task-id <task-id>
node {baseDir}/scripts/balance-image.js
```

## Workflow

1. Identify the user's intent: text-to-image, image-to-image, status lookup, or model lookup.
2. Collect the `prompt` and, if needed, one or more public `https` reference image URLs.
3. Apply defaults: `WERYAI_IMAGE_2_0`, `image_number=1`, `aspect_ratio=9:16`, unless the user asks otherwise.
4. If the user wants a custom model or non-default parameters, run `models-image.js` first when support is uncertain.
5. Use `--dry-run` when you need to preview the final payload before a paid submission.
6. Use `wait-image.js` when the user wants final image URLs now.
7. Use `submit-*` only when the user explicitly wants task creation without polling.
8. Use `status-image.js` to re-check an existing task or batch safely.

## Input Rules

- `prompt` is required for both text-to-image and image-to-image requests.
- For image-to-image, either `image` or `images` is accepted; both are normalized to the API `images` array.
- Every reference image must be a public `https` URL.
- Prefer model-supported values for `aspect_ratio`, `image_number`, and `resolution`.
- Do not invent undocumented request fields.

## Output

All commands print JSON to stdout. Successful result objects can include:

- `taskId`, `taskIds`, `batchId`
- `taskStatus`
- `images`
- `balance`
- `errorCode`, `errorMessage`

See [references/error-codes.md](references/error-codes.md) for common failure classes and recovery hints.

## Definition Of Done

The task is done when:

- local validation passes without CLI-side errors,
- `submit-*` returns a valid task ID or batch ID,
- or `wait-image.js` reaches a terminal result with at least one image URL,
- or `status-image.js` returns a clear in-progress or terminal state,
- and the output makes it explicit whether image URLs are present.

## Constraints

- Do not assume every image model supports every optional field.
- Do not use local file paths for reference images.
- Do not re-run `submit` or `wait` casually because each run can create a new paid task.
- Do not broaden this skill into general image editing outside the documented WeryAI API surface.

## Re-run Behavior

- `submit-text-image.js` and `submit-image-to-image.js` are not idempotent; re-running them can create new paid tasks.
- `wait-image.js` is not idempotent for the same reason: it submits first, then polls.
- `status-image.js`, `models-image.js`, and `balance-image.js` are safe to re-run.

## References

- Model metadata and parameter rules: [references/api-models.md](references/api-models.md)
- Error handling guidance: [references/error-codes.md](references/error-codes.md)
