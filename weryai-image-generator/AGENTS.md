# WeryAI Image Generator

Use this package when the task is official WeryAI image generation through the WeryAI API.

Preferred entry points:

- `node {baseDir}/scripts/wait-image.js`
- `node {baseDir}/scripts/submit-text-image.js`
- `node {baseDir}/scripts/submit-image-to-image.js`
- `node {baseDir}/scripts/status-image.js`
- `node {baseDir}/scripts/models-image.js`
- `node {baseDir}/scripts/balance-image.js`

Default execution policy:

- In agent environments, prefer asynchronous two-stage execution.
- Stage 1: run the matching `submit-*` command and return `taskId` or `batchId`.
- Stage 2: use `node {baseDir}/scripts/status-image.js` to poll the existing task when the user wants progress or final results.
- Use `node {baseDir}/scripts/wait-image.js` only when the user explicitly asks for one-shot submit-and-wait behavior.

Route intents this way:

- prompt only -> text-to-image
- `image` or `images` -> image-to-image
- `taskId` or `batchId` -> status query, not a new paid submission
- model or parameter question -> run `models-image.js` first

Delivery rules:
- When an image or image set is ready, send/display the actual image output to the user immediately.
- Never stop at a filename or local file path alone. If the environment supports file sending, send the file. If it supports inline rendering, render inline. Otherwise provide a usable download URL.

Read `SKILL.md` first for trigger language, defaults, workflow, and constraints.
Read `references/api-models.md` when you need exact model capabilities or parameter support.
Read `references/error-codes.md` when debugging failures or retry behavior.
