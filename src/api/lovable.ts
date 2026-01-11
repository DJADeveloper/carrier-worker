import { config } from '../config';
import { logger } from '../logger';
import { Job } from '../carriers/types';

export interface PollRequest {
  worker_id: string;
  carrier_names?: string[];
  limit: number;
}

export interface PollResponse {
  jobs: Job[];
}

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

export async function pollForJobs(carrierNames?: string[]): Promise<PollResponse> {
  const url = `${config.lovable.baseUrl}/functions/v1/automation-poll`;
  
  const requestBody: PollRequest = {
    worker_id: config.lovable.workerId,
    limit: 1,
  };
  
  if (carrierNames && carrierNames.length > 0) {
    requestBody.carrier_names = carrierNames;
  }
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-key': config.lovable.workerApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      throw new Error(`Poll request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.body.json()) as PollResponse;
    return data;
  } catch (error) {
    logger.error({ error }, 'Failed to poll for jobs');
    throw error;
  }
}

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  const url = `${config.lovable.baseUrl}/functions/v1/automation-webhook`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-key': config.lovable.workerApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText} - ${text}`);
    }

    logger.info({ payload }, 'Webhook sent successfully');
  } catch (error) {
    logger.error({ error, payload }, 'Failed to send webhook');
    throw error;
  }
}
