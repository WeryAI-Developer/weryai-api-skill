#!/usr/bin/env node
/**
 * WeryAI video toolkits CLI.
 *
 * Commands:
 *   tools
 *   submit --tool <id> --json '{...}'
 *   wait --tool <id> --json '{...}'
 *   status --task-id <id>
 *
 * Runtime secret:
 *   WERYAI_API_KEY
 */

const BASE_URL = (process.env.WERYAI_BASE_URL || "https://api.weryai.com").replace(/\/$/, "");
const POLL_INTERVAL_MS = Number(process.env.WERYAI_POLL_INTERVAL_MS || 6000);
const POLL_TIMEOUT_MS = Number(process.env.WERYAI_POLL_TIMEOUT_MS || 600000);

const STATUS_MAP = {
  waiting: "waiting",
  WAITING: "waiting",
  pending: "waiting",
  PENDING: "waiting",
  processing: "processing",
  PROCESSING: "processing",
  succeed: "completed",
  SUCCEED: "completed",
  success: "completed",
  SUCCESS: "completed",
  failed: "failed",
  FAILED: "failed",
};

const ERROR_MESSAGES = {
  400: "Bad request. Check your request parameters.",
  403: "Invalid API key or IP access denied. Verify WERYAI_API_KEY.",
  500: "WeryAI server error. Please try again later.",
  1001: "Parameter error. Check the required fields and enum values.",
  1002: "Authentication failed. Verify WERYAI_API_KEY.",
  1003: "Task or resource not found.",
  1011: "Insufficient credits. Recharge at weryai.com.",
  6004: "Generation failed. Please try again later.",
};

const RECT_FIELDS = ["lt_x", "lt_y", "rb_x", "rb_y"];

const TOOLS = {
  "anime-replace": {
    endpoint: "/v1/generation/video-anime-replace",
    summary: "Use anime-style AI to replace or move an element in a video.",
    required: ["video_url", "image_url"],
    defaults: { type: "replace", resolution: "720p" },
    enums: {
      type: ["move", "replace"],
      resolution: ["480p", "580p", "720p"],
    },
    urlFields: ["video_url", "image_url"],
  },
  "background-remove": {
    endpoint: "/v1/generation/video-background-remove",
    summary: "Remove or replace the background with a solid color.",
    required: ["video_url"],
    defaults: { background_color: "BLACK" },
    enums: {
      background_color: [
        "TRANSPARENT",
        "BLACK",
        "WHITE",
        "GRAY",
        "RED",
        "GREEN",
        "BLUE",
        "YELLOW",
        "CYAN",
        "MAGENTA",
        "ORANGE",
      ],
    },
    urlFields: ["video_url"],
  },
  extend: {
    endpoint: "/v1/generation/video-extend",
    summary: "Extend a video with a prompt, style, resolution, and duration.",
    required: ["video_url", "prompt"],
    defaults: { style: "anime", resolution: "720p", duration: 5 },
    enums: {
      style: ["anime", "3d_animation", "cyberpunk", "comic"],
      resolution: ["360p", "540p", "720p", "1080p"],
      duration: [5, 8],
    },
    urlFields: ["video_url"],
  },
  "face-change": {
    endpoint: "/v1/generation/video-face-change",
    summary: "Replace the face in a video using a reference face image.",
    required: ["video_url", "image_url"],
    defaults: {},
    enums: {},
    urlFields: ["video_url", "image_url"],
  },
  "lips-change": {
    endpoint: "/v1/generation/video-lips-change",
    summary: "Sync lip movements in a video to a provided audio track.",
    required: ["video_url", "audio_url"],
    defaults: {},
    enums: {},
    urlFields: ["video_url", "audio_url"],
  },
  "magic-style": {
    endpoint: "/v1/generation/video-magic",
    summary: "Apply a supported magic style transfer to a source video.",
    required: ["video_url"],
    defaults: { video_style: "anime_style_3" },
    enums: {
      video_style: ["realistic_2", "anime_style_3", "anime_style_4"],
    },
    urlFields: ["video_url"],
  },
  "subtitle-erase": {
    endpoint: "/v1/generation/video-subtitle-erase",
    summary: "Erase subtitles or text from a video. Regions are optional.",
    required: ["video_url"],
    defaults: {},
    enums: {},
    urlFields: ["video_url"],
    rectField: "rect_vo_list",
  },
  "subtitle-translate": {
    endpoint: "/v1/generation/video-subtitle-translate",
    summary: "Translate subtitles in a video to a target language code.",
    required: ["video_url", "target_language"],
    defaults: {},
    enums: {},
    urlFields: ["video_url"],
  },
  upscaler: {
    endpoint: "/v1/generation/video-upscaler",
    summary: "Upscale a source video to a higher resolution.",
    required: ["video_url"],
    defaults: { resolution: "1080p" },
    enums: {
      resolution: ["1080p", "2k", "4k"],
    },
    urlFields: ["video_url"],
  },
  "watermark-remove": {
    endpoint: "/v1/generation/video-watermark-remove",
    summary: "Remove watermarks from a video. Regions are optional.",
    required: ["video_url"],
    defaults: {},
    enums: {},
    urlFields: ["video_url"],
    rectField: "rect_vo_list",
  },
};

function printHelp() {
  const lines = [
    "Usage:",
    "  node scripts/video_toolkits.js tools",
    "  node scripts/video_toolkits.js submit --tool <tool-id> --json '{...}' [--dry-run] [--pretty]",
    "  node scripts/video_toolkits.js wait --tool <tool-id> --json '{...}' [--dry-run] [--pretty]",
    "  node scripts/video_toolkits.js status --task-id <task-id> [--pretty]",
    "",
    "Tool IDs:",
    ...Object.entries(TOOLS).map(([id, tool]) => `  - ${id}: ${tool.summary}`),
    "",
    "Notes:",
    "  - Real submit/wait/status calls require WERYAI_API_KEY.",
    "  - Dry-run validates and prints the request body without calling WeryAI.",
    "  - video_url, image_url, and audio_url must be public https:// URLs.",
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToolId(value) {
  return String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function normalizeRectList(value) {
  if (value == null) return null;
  if (!Array.isArray(value)) return value;
  return value.map((rect) => {
    const next = {};
    for (const field of RECT_FIELDS) {
      if (rect?.[field] != null) next[field] = Number(rect[field]);
    }
    return next;
  });
}

function normalizePayload(toolId, input) {
  const payload = { ...(input || {}) };
  if (toolId === "anime-replace") {
    if (payload.mode && payload.type == null) payload.type = payload.mode;
  }
  if ((toolId === "subtitle-erase" || toolId === "watermark-remove") && payload.rects && payload.rect_vo_list == null) {
    payload.rect_vo_list = payload.rects;
  }
  if (payload.rect_vo_list != null) payload.rect_vo_list = normalizeRectList(payload.rect_vo_list);
  return payload;
}

function buildPayload(toolId, input) {
  const spec = TOOLS[toolId];
  const normalized = normalizePayload(toolId, input);
  return { ...spec.defaults, ...normalized };
}

function validateHttpsUrl(value, fieldName, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${fieldName} must be a non-empty URL string.`);
    return;
  }
  if (!value.startsWith("https://")) {
    errors.push(`${fieldName} must be a public https:// URL.`);
  }
}

function validateRectList(value, fieldName, errors) {
  if (value == null) return;
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array of normalized rectangles.`);
    return;
  }
  value.forEach((rect, index) => {
    for (const field of RECT_FIELDS) {
      const n = rect?.[field];
      if (typeof n !== "number" || Number.isNaN(n) || n < 0 || n > 1) {
        errors.push(`${fieldName}[${index}].${field} must be a number between 0 and 1.`);
      }
    }
    if (typeof rect?.lt_x === "number" && typeof rect?.rb_x === "number" && rect.lt_x >= rect.rb_x) {
      errors.push(`${fieldName}[${index}] must satisfy lt_x < rb_x.`);
    }
    if (typeof rect?.lt_y === "number" && typeof rect?.rb_y === "number" && rect.lt_y >= rect.rb_y) {
      errors.push(`${fieldName}[${index}] must satisfy lt_y < rb_y.`);
    }
  });
}

function validatePayload(toolId, payload) {
  const spec = TOOLS[toolId];
  const errors = [];

  for (const field of spec.required) {
    if (payload[field] == null || payload[field] === "") {
      errors.push(`${field} is required for tool ${toolId}.`);
    }
  }

  for (const field of spec.urlFields) {
    if (payload[field] != null) validateHttpsUrl(payload[field], field, errors);
  }

  if (spec.rectField) {
    validateRectList(payload[spec.rectField], spec.rectField, errors);
  }

  for (const [field, allowedValues] of Object.entries(spec.enums)) {
    if (payload[field] == null) continue;
    const value = typeof allowedValues[0] === "number" ? Number(payload[field]) : String(payload[field]);
    if (!allowedValues.includes(value)) {
      errors.push(`${field} must be one of: ${allowedValues.join(", ")}.`);
    } else {
      payload[field] = value;
    }
  }

  return errors;
}

function getApiKey() {
  const apiKey = (process.env.WERYAI_API_KEY || "").trim();
  if (!apiKey) {
    return null;
  }
  return apiKey;
}

async function httpJson(method, url, body, apiKey) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    let data;
    try {
      data = await res.json();
    } catch {
      data = { status: res.status, message: `Non-JSON response (HTTP ${res.status})` };
    }

    return { httpStatus: res.status, ...data };
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === "AbortError") {
      throw new Error(`Request timeout: ${method} ${url}`);
    }
    throw error;
  }
}

function isApiSuccess(res) {
  const httpOk = res.httpStatus >= 200 && res.httpStatus < 300;
  const bodyOk = res.status === 0 || res.status === 200;
  return httpOk && bodyOk;
}

function formatApiError(res) {
  const httpStatus = res.httpStatus || 0;
  const code = res.status;
  const msg = res.msg || res.message || "";

  if (httpStatus === 403) {
    return { ok: false, phase: "failed", errorCode: "403", errorMessage: `${ERROR_MESSAGES[403]}${msg ? ` (${msg})` : ""}` };
  }
  if (httpStatus >= 500) {
    return { ok: false, phase: "failed", errorCode: "500", errorMessage: `${ERROR_MESSAGES[500]}${msg ? ` (${msg})` : ""}` };
  }
  if (httpStatus === 400) {
    return { ok: false, phase: "failed", errorCode: "400", errorMessage: `${ERROR_MESSAGES[400]}${msg ? ` (${msg})` : ""}` };
  }

  const friendly = ERROR_MESSAGES[code] || "";
  return {
    ok: false,
    phase: "failed",
    errorCode: code != null ? String(code) : null,
    errorMessage: friendly && msg ? `${friendly} (${msg})` : friendly || msg || `API error (status ${code}, HTTP ${httpStatus})`,
  };
}

function extractVideos(taskData) {
  const raw = taskData?.videos || taskData?.task_result?.videos || [];
  return raw.map((item) => {
    if (typeof item === "string") return { url: item };
    return {
      url: item?.url || item?.video_url || "",
      cover_url: item?.cover_url || item?.cover_image_url || "",
    };
  });
}

async function submitTool(toolId, payload, apiKey) {
  const spec = TOOLS[toolId];
  const res = await httpJson("POST", BASE_URL + spec.endpoint, payload, apiKey);
  if (!isApiSuccess(res)) return formatApiError(res);

  const data = res.data || {};
  const taskIds = data.task_ids ?? (data.task_id ? [data.task_id] : []);
  return {
    ok: true,
    phase: "submitted",
    tool: toolId,
    endpoint: spec.endpoint,
    batchId: data.batch_id ?? null,
    taskIds,
    taskId: taskIds[0] ?? data.task_id ?? null,
    taskStatus: null,
    videos: null,
    errorCode: null,
    errorMessage: null,
  };
}

async function statusTask(taskId, apiKey) {
  const res = await httpJson("GET", `${BASE_URL}/v1/generation/${taskId}/status`, null, apiKey);
  if (!isApiSuccess(res)) return formatApiError(res);

  const taskData = res.data || {};
  const rawStatus = taskData.task_status || "";
  const normalized = STATUS_MAP[rawStatus] || "unknown";
  const result = taskData.task_result || {};

  return {
    ok: normalized !== "failed",
    phase: normalized === "completed" ? "completed" : normalized === "failed" ? "failed" : "running",
    taskId,
    taskStatus: rawStatus,
    videos: extractVideos(taskData),
    errorCode: normalized === "failed" ? "TASK_FAILED" : null,
    errorMessage: normalized === "failed" ? result.message || taskData.msg || "Task failed." : null,
  };
}

async function waitForTask(taskId, apiKey) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const status = await statusTask(taskId, apiKey);
    if (!status.ok && status.phase === "failed") return status;
    if (status.phase === "completed") return status;
  }
  return {
    ok: false,
    phase: "failed",
    taskId,
    taskStatus: "unknown",
    videos: null,
    errorCode: "TIMEOUT",
    errorMessage: `Poll timeout after ${Math.floor(POLL_TIMEOUT_MS / 1000)}s.`,
  };
}

function parseArgs(argv) {
  const command = argv[0] || "help";
  const args = {
    command,
    tool: null,
    json: null,
    taskId: null,
    dryRun: false,
    pretty: false,
  };

  for (let i = 1; i < argv.length; i++) {
    const current = argv[i];
    if (current === "--tool") args.tool = argv[++i] ?? null;
    else if (current === "--json") args.json = argv[++i] ?? null;
    else if (current === "--task-id") args.taskId = argv[++i] ?? null;
    else if (current === "--dry-run") args.dryRun = true;
    else if (current === "--pretty") args.pretty = true;
    else if (current === "--help" || current === "-h") args.command = "help";
  }

  return args;
}

function parseJsonInput(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON passed to --json: ${error.message}`);
  }
}

function print(result, pretty = false) {
  const spaces = pretty ? 2 : 0;
  process.stdout.write(JSON.stringify(result, null, spaces) + "\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    printHelp();
    return;
  }

  if (args.command === "tools") {
    const toolList = Object.entries(TOOLS).map(([id, tool]) => ({
      id,
      endpoint: tool.endpoint,
      summary: tool.summary,
      required: tool.required,
      defaults: tool.defaults,
      enums: tool.enums,
    }));
    print({ ok: true, tools: toolList }, true);
    return;
  }

  if (args.command === "status") {
    if (!args.taskId) throw new Error("--task-id is required for status");
    const apiKey = getApiKey();
    if (!apiKey) {
      print({
        ok: false,
        phase: "failed",
        errorCode: "NO_API_KEY",
        errorMessage: "Missing WERYAI_API_KEY environment variable. Get one from https://www.weryai.com/api/keys and configure it only in the runtime environment before using this skill.",
      }, true);
      process.exitCode = 1;
      return;
    }
    const result = await statusTask(args.taskId, apiKey);
    print(result, true);
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (args.command !== "submit" && args.command !== "wait") {
    throw new Error(`Unsupported command: ${args.command}`);
  }

  const toolId = normalizeToolId(args.tool);
  if (!TOOLS[toolId]) {
    throw new Error(`Unknown --tool: ${args.tool}. Use "tools" to list supported tool IDs.`);
  }

  const payload = buildPayload(toolId, parseJsonInput(args.json));
  const validationErrors = validatePayload(toolId, payload);
  if (validationErrors.length > 0) {
    print({
      ok: false,
      phase: "failed",
      tool: toolId,
      errorCode: "VALIDATION",
      errorMessage: validationErrors.join(" "),
      required: TOOLS[toolId].required,
      defaults: TOOLS[toolId].defaults,
    }, true);
    process.exitCode = 1;
    return;
  }

  if (args.dryRun) {
    print({
      ok: true,
      phase: args.command === "wait" ? "wait-dry-run" : "submit-dry-run",
      tool: toolId,
      endpoint: TOOLS[toolId].endpoint,
      requestPreview: {
        method: "POST",
        url: `${BASE_URL}${TOOLS[toolId].endpoint}`,
        body: payload,
      },
    }, true);
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    print({
      ok: false,
      phase: "failed",
      errorCode: "NO_API_KEY",
      errorMessage: "Missing WERYAI_API_KEY environment variable. Get one from https://www.weryai.com/api/keys and configure it only in the runtime environment before using this skill.",
    }, true);
    process.exitCode = 1;
    return;
  }

  const submitResult = await submitTool(toolId, payload, apiKey);
  if (!submitResult.ok) {
    print(submitResult, true);
    process.exitCode = 1;
    return;
  }

  if (args.command === "submit") {
    print(submitResult, true);
    return;
  }

  const waitResult = await waitForTask(submitResult.taskId, apiKey);
  print({
    ...waitResult,
    tool: toolId,
    batchId: submitResult.batchId,
    taskIds: submitResult.taskIds,
  }, true);
  if (!waitResult.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
