# WeryAI Music Generator

Use this package when the task is official WeryAI music generation through the WeryAI API.

Preferred entry points:

- `node {baseDir}/scripts/wait-music.js`
- `node {baseDir}/scripts/submit-music.js`
- `node {baseDir}/scripts/status-music.js`
- `node {baseDir}/scripts/balance-music.js`

Route intents this way:

- generic music request -> default to `VOCAL_SONG`
- instrumental, soundtrack, background music -> `ONLY_MUSIC`
- song, vocals, lyrics, singer gender, timbre -> `VOCAL_SONG`
- existing `taskId` -> status query, not a new paid submission
- account readiness question -> check balance first

Read `SKILL.md` first for trigger language, defaults, workflow, and constraints.
Read `references/api-music.md` when you need exact field rules or style keys.
Read `references/error-codes.md` when debugging failures or retry behavior.
