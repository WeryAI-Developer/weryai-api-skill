# WeryAI Video Generator

Use this package when the task is official WeryAI video generation through the WeryAI API.

Preferred entry points:

- `node {baseDir}/scripts/wait-video.js`
- `node {baseDir}/scripts/submit-text-video.js`
- `node {baseDir}/scripts/submit-image-video.js`
- `node {baseDir}/scripts/submit-multi-image-video.js`
- `node {baseDir}/scripts/status-video.js`
- `node {baseDir}/scripts/models-video.js`
- `node {baseDir}/scripts/balance-video.js`

Route intents this way:

- text brief -> text-to-video
- `image` -> image-to-video
- `first_frame` + `last_frame`, or `image` + `last_image` -> ordered multi-image transition flow
- `images` -> multi-image-to-video
- `taskId` or `batchId` -> status query, not a new paid submission

Read `SKILL.md` first for trigger language, defaults, workflow, and constraints.
Read `references/api-models.md` when you need exact model capabilities or parameter support.
Read `references/error-codes.md` when debugging failures or retry behavior.
