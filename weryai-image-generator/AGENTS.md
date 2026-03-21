# WeryAI Image Generator

Use this package when the task is official WeryAI image generation through the WeryAI API.

Preferred entry points:

- `node {baseDir}/scripts/wait-image.js`
- `node {baseDir}/scripts/submit-text-image.js`
- `node {baseDir}/scripts/submit-image-to-image.js`
- `node {baseDir}/scripts/status-image.js`
- `node {baseDir}/scripts/models-image.js`
- `node {baseDir}/scripts/balance-image.js`

Route intents this way:

- prompt only -> text-to-image
- `image` or `images` -> image-to-image
- `taskId` or `batchId` -> status query, not a new paid submission
- model or parameter question -> run `models-image.js` first

Read `SKILL.md` first for trigger language, defaults, workflow, and constraints.
Read `references/api-models.md` when you need exact model capabilities or parameter support.
Read `references/error-codes.md` when debugging failures or retry behavior.
