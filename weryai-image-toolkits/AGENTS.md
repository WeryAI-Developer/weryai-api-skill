# WeryAI Image Toolkits

Use this package when the user wants WeryAI image editing or post-processing rather than text-to-image or image-to-image generation.

Preferred entry points:

- `node {baseDir}/scripts/image_toolkits.js tools`
- `node {baseDir}/scripts/image_toolkits.js submit --tool <tool-id> --json '{...}'`
- `node {baseDir}/scripts/image_toolkits.js wait --tool <tool-id> --json '{...}'`
- `node {baseDir}/scripts/image_toolkits.js status --task-id <task-id>`

Route intents this way:

- analyze image into a prompt -> `image-to-prompt`
- replace or recolor background -> `background-change`
- remove background -> `background-remove`
- expand canvas -> `expand`
- face swap -> `face-swap`
- change aspect ratio -> `reframe`
- repair old photo -> `repair`
- erase text or watermark -> `text-erase`
- translate image text -> `translate`
- upscale image -> `upscale`

Read `SKILL.md` first for trigger language, defaults, missing-parameter guidance, and paid-run confirmation rules.
Read `references/image-tools-matrix.md` when you need exact required fields, defaults, or enum values.
