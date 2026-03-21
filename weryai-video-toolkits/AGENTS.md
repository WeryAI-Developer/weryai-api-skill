# WeryAI Video Toolkits

Use this package when the user wants WeryAI video editing or post-processing rather than video generation.

Preferred entry points:

- `node {baseDir}/scripts/video_toolkits.js tools`
- `node {baseDir}/scripts/video_toolkits.js submit --tool <tool-id> --json '{...}'`
- `node {baseDir}/scripts/video_toolkits.js wait --tool <tool-id> --json '{...}'`
- `node {baseDir}/scripts/video_toolkits.js status --task-id <task-id>`

Route intents this way:

- replace object in anime style -> `anime-replace`
- remove or recolor video background -> `background-remove`
- extend a short video -> `extend`
- swap face in a video -> `face-change`
- lip-sync video to audio -> `lips-change`
- transfer video style -> `magic-style`
- remove subtitles -> `subtitle-erase`
- translate subtitles -> `subtitle-translate`
- upscale video -> `upscaler`
- remove watermark -> `watermark-remove`

Read `SKILL.md` first for trigger language, defaults, missing-parameter guidance, and paid-run confirmation rules.
Read `references/video-tools-matrix.md` when you need exact required fields, defaults, or enum values.
