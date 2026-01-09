import { config } from './config';
import { pollForJobs, sendWebhook } from './api/lovable';
import { withBrowser } from './engine/playwright';
import { runCarrierScript } from './carriers';
import { normalizeError } from './engine/errors';
import { Job } from './carriers/types';
import { logger } from './logger';
import { startHealthcheckServer } from './healthcheck';

async function processJob(job: Job): Promise<void> {
  logger.info(
    { 
      carrierSubmissionId: job.carrier_submission_id,
      carrierName: job.carrier_name,
    },
    'Processing job'
  );

  // Send RUNNING status with initial step
  await sendWebhook({
    worker_id: config.lovable.workerId,
    carrier_submission_id: job.carrier_submission_id,
    status: 'RUNNING',
    last_step: 'initializing',
  });

  try {
    // Process with timeout
    const result = await Promise.race([
      withBrowser(
        {
          headless: config.playwright.headless,
          timeout: config.polling.jobTimeoutMs,
        },
        async (page) => {
          // Send RUNNING status with step
          await sendWebhook({
            worker_id: config.lovable.workerId,
            carrier_submission_id: job.carrier_submission_id,
            status: 'RUNNING',
            last_step: 'running_automation',
          });
          
          return await runCarrierScript(job, page);
        }
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${config.polling.jobTimeoutMs}ms`));
        }, config.polling.jobTimeoutMs);
      }),
    ]);

    // Send result webhook
    const webhookPayload: any = {
      worker_id: config.lovable.workerId,
      carrier_submission_id: job.carrier_submission_id,
      status: result.status,
      screenshots: result.screenshots,
    };

    if (result.status === 'COMPLETE' && result.quoteResult) {
      webhookPayload.quote_result = result.quoteResult;
    } else if (result.status === 'NEEDS_REVIEW' && result.needsReviewFields) {
      webhookPayload.needs_review_fields = result.needsReviewFields;
    } else if (result.status === 'FAILED') {
      webhookPayload.error_code = result.errorCode;
      if (result.errorMessage) {
        webhookPayload.error_message = result.errorMessage;
      }
    }

    await sendWebhook(webhookPayload);

    logger.info(
      { carrierSubmissionId: job.carrier_submission_id, status: result.status },
      'Job completed'
    );
  } catch (error) {
    const normalized = normalizeError(error);
    
    logger.error(
      { error, carrierSubmissionId: job.carrier_submission_id },
      'Job failed'
    );

    await sendWebhook({
      worker_id: config.lovable.workerId,
      carrier_submission_id: job.carrier_submission_id,
      status: 'FAILED',
      error_code: normalized.code,
      error_message: normalized.message,
    });
  }
}

async function main() {
  logger.info({ workerId: config.lovable.workerId }, 'Starting carrier worker');
  
  // Log startup OK
  logger.info('Worker startup: OK');

  // Start healthcheck server (for Railway/Fly.io health checks)
  // Use PORT env var if set, otherwise default to 8080
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  startHealthcheckServer(port);

  while (true) {
    try {
      const jobs = await pollForJobs();

      if (jobs && jobs.length > 0) {
        // Process the first job only
        await processJob(jobs[0]);
      } else {
        logger.debug('No jobs available, sleeping');
      }
    } catch (error) {
      logger.error({ error }, 'Error in main loop');
    }

    // Sleep before next poll
    await new Promise((resolve) => setTimeout(resolve, config.polling.intervalMs));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the worker
main().catch((error) => {
  logger.fatal({ error }, 'Fatal error in main');
  process.exit(1);
});
