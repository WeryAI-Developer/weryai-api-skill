import { createClient } from '../weryai-core/client.js';
import { buildPayload, validateSubmit } from './validators.js';
import { isApiSuccess, formatApiError, formatNetworkError } from '../weryai-core/errors.js';
import { normalizeMusicInput } from './normalize-input.js';

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
  let res;
  try {
    res = await client.post('/v1/generation/music/generate', body);
  } catch (err) {
    return formatNetworkError(err);
  }

  if (!isApiSuccess(res)) {
    return formatApiError(res);
  }

  const data = res.data || {};
  const taskIds = data.task_ids ?? (data.task_id ? [data.task_id] : []);

  return {
    ok: true,
    phase: 'submitted',
    batchId: data.batch_id ?? null,
    taskIds,
    taskId: data.task_id ?? taskIds[0] ?? null,
    taskStatus: normalizeSubmittedStatus(data.task_status ?? data.taskStatus),
    audios: null,
    lyrics: null,
    coverUrl: null,
    balance: null,
    errorCode: null,
    errorMessage: null,
  };
}

function normalizeSubmittedStatus(rawStatus) {
  if (rawStatus === 'WAITING' || rawStatus === 'waiting') return 'waiting';
  if (rawStatus === 'PROCESSING' || rawStatus === 'processing') return 'processing';
  return rawStatus ?? null;
}
