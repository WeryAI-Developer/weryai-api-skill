#!/usr/bin/env node
/**
 * WeryAI image toolkits CLI.
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

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"];
const TRANSLATE_TYPES = ["text", "image"];

const TOOLS = {
  "image-to-prompt": {
    endpoint: "/v1/generation/image-to-prompt",
    summary: "Analyze an image and return a descriptive prompt synchronously.",
    required: ["img_url", "image_size"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
    sync: true,
  },
  "background-change": {
    endpoint: "/v1/generation/image-bg-change",
    summary: "Replace or modify the background using a prompt or a color.",
    required: ["img_url"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
  },
  "background-remove": {
    endpoint: "/v1/generation/image-bg-remove",
    summary: "Automatically remove the background from an image.",
    required: ["img_url"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
  },
  expand: {
    endpoint: "/v1/generation/image-expand",
    summary: "Expand canvas size and place the original image onto the new canvas.",
    required: ["img_url", "original_image_size", "canvas_size", "original_image_location"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
  },
  "face-swap": {
    endpoint: "/v1/generation/image-face-swap",
    summary: "Swap the face in the source image using a face reference image.",
    required: ["img_url", "face_img_url"],
    defaults: {},
    enums: {},
    urlFields: ["img_url", "face_img_url"],
  },
  reframe: {
    endpoint: "/v1/generation/image-reframe",
    summary: "Change an image aspect ratio to a supported target ratio.",
    required: ["img_url", "aspect_ratio"],
    defaults: {},
    enums: { aspect_ratio: ASPECT_RATIOS },
    urlFields: ["img_url"],
  },
  repair: {
    endpoint: "/v1/generation/image-repair",
    summary: "Restore and enhance an old or damaged photo.",
    required: ["img_url"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
  },
  "text-erase": {
    endpoint: "/v1/generation/image-text-erase",
    summary: "Erase text or watermarks from an image.",
    required: ["img_url"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
  },
  translate: {
    endpoint: "/v1/generation/image-translate",
    summary: "Translate text inside an image to another language.",
    required: ["img_url", "target_lang"],
    defaults: { type: "image" },
    enums: { type: TRANSLATE_TYPES },
    urlFields: ["img_url"],
  },
  upscale: {
    endpoint: "/v1/generation/image-upscale",
    summary: "Enhance an image with 2x upscale.",
    required: ["img_url"],
    defaults: {},
    enums: {},
    urlFields: ["img_url"],
  },
};

function printHelp() {
  const lines = [
    "Usage:",
    "  node scripts/image_toolkits.js tools",
    "  node scripts/image_toolkits.js submit --tool <tool-id> --json '{...}' [--dry-run]",
    "  node scripts/image_toolkits.js wait --tool <tool-id> --json '{...}' [--dry-run]",
    "  node scripts/image_toolkits.js status --task-id <task-id>",
    "",
    "Tool IDs:",
    ...Object.entries(TOOLS).map(([id, tool]) => `  - ${id}: ${tool.summary}`),
    "",
    "Notes:",
    "  - Real submit/wait/status calls require WERYAI_API_KEY.",
    "  - Dry-run validates and prints the request body without calling WeryAI.",
    "  - img_url and face_img_url must be public https:// URLs.",
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToolId(value) {
  return String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function parseJsonInput(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON passed to --json: ${error.message}`);
  }
}

function normalizePayload(toolId, input) {
  const payload = { ...(input || {}) };
  if (toolId === "translate" && payload.target_language && payload.target_lang == null) {
    payload.target_lang = payload.target_language;
  }
  if (toolId === "background-change" && payload.background_color && payload.bg_color == null) {
    payload.bg_color = payload.background_color;
  }
  return payload;
}

function buildPayload(toolId, input) {
  const spec = TOOLS[toolId];
  return { ...spec.defaults, ...normalizePayload(toolId, input) };
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

function validateSizeString(value, fieldName, errors) {
  if (typeof value !== "string" || !/^\d+x\d+$/i.test(value.trim())) {
    errors.push(`${fieldName} must use WIDTHxHEIGHT format, e.g. 1024x1024.`);
  }
}

function validateLocationString(value, fieldName, errors) {
  if (typeof value !== "string" || !/^\d+\s*,\s*\d+$/.test(value.trim())) {
    errors.push(`${fieldName} must use x,y pixel coordinates, e.g. 256,256.`);
  }
}

function validateHexColor(value, fieldName, errors) {
  if (value == null) return;
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    errors.push(`${fieldName} must be a hex color like #FFFFFF.`);
  }
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

  for (const [field, allowedValues] of Object.entries(spec.enums)) {
    if (payload[field] == null) continue;
    const value = String(payload[field]);
    if (!allowedValues.includes(value)) {
      errors.push(`${field} must be one of: ${allowedValues.join(", ")}.`);
    } else {
      payload[field] = value;
    }
  }

  if (toolId === "image-to-prompt" && payload.image_size != null) {
    const n = Number(payload.image_size);
    if (!Number.isInteger(n) || n < 1) errors.push("image_size must be a positive integer in KB.");
    else payload.image_size = n;
  }

  if (toolId === "background-change") {
    if (!payload.prompt && !payload.bg_color) {
      errors.push("background-change requires either prompt or bg_color.");
    }
    validateHexColor(payload.bg_color, "bg_color", errors);
  }

  if (toolId === "expand") {
    validateSizeString(payload.original_image_size, "original_image_size", errors);
    validateSizeString(payload.canvas_size, "canvas_size", errors);
    validateLocationString(payload.original_image_location, "original_image_location", errors);
  }

  return errors;
}

function getApiKey() {
  const apiKey = (process.env.WERYAI_API_KEY || "").trim();
  return apiKey || null;
}

async function httpJson(method, url, body, apiKey) {
  const headers = { "Content-Type": "application/json" };
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
    if (error?.name === "AbortError") throw new Error(`Request timeout: ${method} ${url}`);
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

function extractImages(taskData) {
  const raw = taskData?.images || taskData?.task_result?.images || [];
  return raw.map((item) => {
    if (typeof item === "string") return { url: item };
    return { url: item?.url || item?.image_url || "" };
  });
}

async function submitTool(toolId, payload, apiKey) {
  const spec = TOOLS[toolId];
  const res = await httpJson("POST", BASE_URL + spec.endpoint, payload, apiKey);
  if (!isApiSuccess(res)) return formatApiError(res);

  if (spec.sync) {
    return {
      ok: true,
      phase: "completed",
      tool: toolId,
      endpoint: spec.endpoint,
      taskId: null,
      taskStatus: "succeed",
      prompt: res.data?.prompt ?? null,
      cost_mill: res.data?.cost_mill ?? null,
      images: null,
      errorCode: null,
      errorMessage: null,
    };
  }

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
    taskStatus: data.task_status ?? null,
    images: null,
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
    images: extractImages(taskData),
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
    images: null,
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
  };
  for (let i = 1; i < argv.length; i++) {
    const current = argv[i];
    if (current === "--tool") args.tool = argv[++i] ?? null;
    else if (current === "--json") args.json = argv[++i] ?? null;
    else if (current === "--task-id") args.taskId = argv[++i] ?? null;
    else if (current === "--dry-run") args.dryRun = true;
    else if (current === "--help" || current === "-h") args.command = "help";
  }
  return args;
}

function print(result) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    printHelp();
    return;
  }

  if (args.command === "tools") {
    print({
      ok: true,
      tools: Object.entries(TOOLS).map(([id, tool]) => ({
        id,
        endpoint: tool.endpoint,
        summary: tool.summary,
        required: tool.required,
        defaults: tool.defaults,
        enums: tool.enums,
        sync: Boolean(tool.sync),
      })),
    });
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
      });
      process.exitCode = 1;
      return;
    }
    const result = await statusTask(args.taskId, apiKey);
    print(result);
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
    });
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
    });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    print({
      ok: false,
      phase: "failed",
      errorCode: "NO_API_KEY",
      errorMessage: "Missing WERYAI_API_KEY environment variable. Get one from https://www.weryai.com/api/keys and configure it only in the runtime environment before using this skill.",
    });
    process.exitCode = 1;
    return;
  }

  const submitResult = await submitTool(toolId, payload, apiKey);
  if (!submitResult.ok) {
    print(submitResult);
    process.exitCode = 1;
    return;
  }

  if (args.command === "submit" || TOOLS[toolId].sync) {
    print(submitResult);
    return;
  }

  const waitResult = await waitForTask(submitResult.taskId, apiKey);
  print({
    ...waitResult,
    tool: toolId,
    batchId: submitResult.batchId,
    taskIds: submitResult.taskIds,
  });
  if (!waitResult.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
