# WeryAI Podcast Generator

Use this package when the task is official WeryAI podcast generation rather than music-only generation or general text chat.

Preferred entry points:

- `node {baseDir}/scripts/speakers.js`
- `node {baseDir}/scripts/submit-text.js`
- `node {baseDir}/scripts/generate-audio.js`
- `node {baseDir}/scripts/status.js`
- `node {baseDir}/scripts/wait.js`

Route intents this way:

- podcast voices or speaker lookup -> `speakers.js`
- create a podcast from a topic -> `wait.js`
- text generation only -> `submit-text.js`
- audio generation for an existing task -> `generate-audio.js`
- inspect podcast task state -> `status.js`

Read `SKILL.md` first for defaults, mode rules, and paid-run workflow.
Read `references/podcast-api.md` when you need the exact endpoint contract.
