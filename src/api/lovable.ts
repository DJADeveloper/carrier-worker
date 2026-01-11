import { config } from '../config';
import { Job } from '../carriers/types';

export type PollResponse = { jobs: Job[]; worker_id?: string };

export interface Screenshot {
  step: string;
  base64: string;
  content_type: 'image/png';
}

export interface WebhookPayload {
  worker_id: string;
  carrier_submission_id: string;
  status: 'RUNNING' | 'NEEDS_REVIEW' | 'FAILED' | 'COMPLETE';
  last_step?: string; // required for RUNNING
  error_code?: string; // required for FAILED
  error_message?: string; // optional for FAILED
  needs_review_fields?: any[]; // required for NEEDS_REVIEW
  quote_result?: any; // required for COMPLETE
  screenshots?: Screenshot[];
}

export async function pollJobs(carrierNames?: string[]): Promise<PollResponse> {
  const r = await fetch(`${config.lovable.baseUrl}/functions/v1/automation-poll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-key': config.lovable.workerApiKey,
    },
    body: JSON.stringify({
      worker_id: config.lovable.workerId,
      carrier_names: carrierNames,
      limit: 1,
    }),
  });

  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`poll failed ${r.status}: ${errorText}`);
  }

  return (await r.json()) as PollResponse;
}

export async function webhook(payload: WebhookPayload): Promise<void> {
  const r = await fetch(`${config.lovable.baseUrl}/functions/v1/automation-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-key': config.lovable.workerApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`webhook failed ${r.status}: ${errorText}`);
  }
}
