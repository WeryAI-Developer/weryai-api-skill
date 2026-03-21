import { createClient, log } from './client.js';
import { formatApiError, formatNetworkError, isApiSuccess } from './errors.js';
import { buildBody, fetchModelRegistry, lookupModel, validateWithModel } from './model-registry.js';
import { DEFAULT_MODEL, FALLBACK_DEFAULTS } from './models.js';
import { detectImageMode, normalizeImageInput } from '../vendor/weryai-image/normalize-input.js';
import { validateSubmitImage, validateSubmitText } from './validators.js';
import { pollSubmittedTasks } from '../vendor/weryai-core/wait.js';

export async function execute(input, ctx) {
  const normalizedInput = normalizeImageInput(input);
  const mode = detectImageMode(normalizedInput);
  const isImageToImage = mode === 'image_to_image';
  const structErrors = isImageToImage ? validateSubmitImage(normalizedInput) : validateSubmitText(normalizedInput);
  if (structErrors.length > 0) {
    return { ok: false, phase: 'failed', errorCode: 'VALIDATION', errorMessage: structErrors.join(' ') };
  }

  const registry = await fetchModelRegistry(ctx);
  const model = normalizedInput.model || DEFAULT_MODEL;
  const meta = lookupModel(registry, model, mode);

  if (meta) {
    const { errors, warnings } = validateWithModel(meta, normalizedInput, mode);
    warnings.forEach((warning) => log(`Warning: ${warning}`));
    if (errors.length > 0) {
      return { ok: false, phase: 'failed', errorCode: 'VALIDATION', errorMessage: errors.join(' ') };
    }
  } else if (registry) {
    log(`Warning: model "${model}" not found in ${mode} registry. Proceeding anyway.`);
  }

  const body = meta ? buildBody(meta, normalizedInput, mode) : buildFallbackBody(normalizedInput, model, isImageToImage);
  const apiPath = isImageToImage ? '/v1/generation/image-to-image' : '/v1/generation/text-to-image';

  if (ctx.dryRun) {
    return {
      ok: true,
      phase: 'dry-run',
      dryRun: true,
      requestBody: body,
      requestUrl: `${ctx.baseUrl}${apiPath}`,
    };
  }

  const client = createClient(ctx);
  let submitRes;
  try {
    submitRes = await client.post(apiPath, body);
  } catch (err) {
    return formatNetworkError(err);
  }

  if (!isApiSuccess(submitRes)) {
    return formatApiError(submitRes);
  }

  const data = submitRes.data || {};
  const batchId = data.batch_id ?? null;
  const taskIds = data.task_ids ?? (data.task_id ? [data.task_id] : []);

  if (taskIds.length === 0) {
    return { ok: false, phase: 'failed', errorCode: 'PROTOCOL', errorMessage: 'API returned success but no task_ids.' };
  }

  return pollSubmittedTasks(client, {
    batchId,
    taskIds,
    ctx,
    outputKey: 'images',
    outputLabel: 'image',
    allowBatch: true,
  });
}

function buildFallbackBody(input, model, isImageToImage) {
  const body = {
    prompt: input.prompt,
    model,
    aspect_ratio: input.aspect_ratio || input.aspectRatio || FALLBACK_DEFAULTS.aspect_ratio,
    image_number: Number(input.image_number || input.imageNumber) || FALLBACK_DEFAULTS.image_number,
  };
  if (isImageToImage) body.images = input.images.slice(0, 1);
  if (input.negative_prompt || input.negativePrompt) {
    body.negative_prompt = input.negative_prompt || input.negativePrompt;
  }
  if (input.resolution) body.resolution = input.resolution;
  return body;
}

export default execute;
