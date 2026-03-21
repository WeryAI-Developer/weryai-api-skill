import { createClient } from './client.js';
import { buildPayload, validateSubmit } from './validators.js';
import { isApiSuccess, formatApiError, formatNetworkError } from './errors.js';
import { normalizeMusicInput } from '../vendor/weryai-music/normalize-input.js';
import { pollSingleTask } from '../vendor/weryai-core/wait.js';

export async function execute(input, ctx) {
  const normalizedInput = normalizeMusicInput(input);
  const validationErrors = validateSubmit(normalizedInput);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      phase: 'failed',
      errorCode: 'VALIDATION',
      errorMessage: validationErrors.join(' '),
    };
  }

  const body = buildPayload(normalizedInput);

  if (ctx.dryRun) {
    return {
      ok: true,
      phase: 'dry-run',
      dryRun: true,
      requestBody: body,
      requestUrl: `${ctx.baseUrl}/v1/generation/music/generate`,
    };
  }

  const client = createClient(ctx);

  let submitRes;
  try {
    submitRes = await client.post('/v1/generation/music/generate', body);
  } catch (err) {
    return formatNetworkError(err);
  }

  if (!isApiSuccess(submitRes)) {
    return formatApiError(submitRes);
  }

  const data = submitRes.data || {};
  const taskId = data.task_id ?? data.task_ids?.[0] ?? null;
  const taskIds = data.task_ids ?? (taskId ? [taskId] : []);

  if (!taskId) {
    return {
      ok: false,
      phase: 'failed',
      errorCode: 'PROTOCOL',
      errorMessage: 'API returned success but no task_id.',
    };
  }

  return pollSingleTask(client, {
    taskId,
    taskIds,
    ctx,
    outputKey: 'audios',
    outputLabel: 'audio',
  });
}
