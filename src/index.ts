import { config } from './config';
import { pollJobs, webhook } from './api/lovable';
import { withBrowser } from './engine/playwright';
import { runCarrierScript } from './carriers';
import { normalizeError } from './engine/errors';
import { ErrorCode } from './engine/errors';
import { Job } from './carriers/types';
import { logger } from './logger';
import { startHealthcheckServer } from './healthcheck';
import { generateSimulatedQuote, generateSimulationScreenshot } from './carriers/simulation';

async function processJob(job: Job): Promise<void> {
  logger.info(
    { 
      carrierSubmissionId: job.carrier_submission_id,
      carrierName: job.carrier_name,
      hasCredentials: job.credentials !== null,
    },
    'Processing job'
  );

  // Check if simulation mode should be triggered
  const shouldSimulate = config.simulation.enabled || job.credentials === null;

  if (shouldSimulate) {
    logger.info(
      { carrierSubmissionId: job.carrier_submission_id, reason: config.simulation.enabled ? 'SIMULATE_CARRIER=true' : 'credentials is null' },
      'Running in simulation mode'
    );

    // Send RUNNING status with initial step
    await webhook({
      worker_id: config.lovable.workerId,
      carrier_submission_id: job.carrier_submission_id,
      status: 'RUNNING',
      last_step: 'initializing',
    });

    try {
      // Generate simulated quote
      const quoteResult = generateSimulatedQuote(job);
      
      // Optionally generate screenshot
      let screenshots: Array<{ step: string; base64: string; content_type: 'image/png' }> = [];
      
      try {
        const screenshot = await withBrowser(
          {
            headless: config.playwright.headless,
            timeout: 10000, // Shorter timeout for screenshot
          },
          async (page) => {
            return await generateSimulationScreenshot(job, quoteResult, page);
          }
        );
        
        if (screenshot) {
          screenshots.push(screenshot);
        }
      } catch (screenshotErr) {
        // Screenshot generation is optional, log but continue
        logger.warn({ err: screenshotErr }, 'Failed to generate simulation screenshot, continuing without it');
      }

      // Send COMPLETE webhook with quote result
      await webhook({
        worker_id: config.lovable.workerId,
        carrier_submission_id: job.carrier_submission_id,
        status: 'COMPLETE',
        last_step: 'Quote generated',
        quote_result: quoteResult,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
      });

      logger.info(
        { carrierSubmissionId: job.carrier_submission_id, quoteNumber: quoteResult.quote_number },
        'Simulation completed successfully'
      );
    } catch (err) {
      // If simulation fails, report as FAILED
      logger.error(
        { err, carrierSubmissionId: job.carrier_submission_id },
        'Simulation failed'
      );

      await webhook({
        worker_id: config.lovable.workerId,
        carrier_submission_id: job.carrier_submission_id,
        status: 'FAILED',
        error_code: ErrorCode.UNKNOWN_ERROR,
        error_message: err instanceof Error ? err.message : 'Unknown error in simulation mode',
      });
    }
    return;
  }

  // Normal processing path (with credentials)
  // Send RUNNING status with initial step
  await webhook({
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
          await webhook({
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

    await webhook(webhookPayload);

    logger.info(
      { carrierSubmissionId: job.carrier_submission_id, status: result.status },
      'Job completed'
    );
  } catch (err) {
    const normalized = normalizeError(err);
    
    logger.error(
      { err, carrierSubmissionId: job.carrier_submission_id },
      'Job failed'
    );

    await webhook({
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
  
  // Log startup OK and masked key for debugging
  const maskedKey = config.lovable.workerApiKey 
    ? `${config.lovable.workerApiKey.substring(0, 4)}...${config.lovable.workerApiKey.substring(config.lovable.workerApiKey.length - 4)}`
    : 'MISSING';
    
  logger.info({ workerId: config.lovable.workerId, maskedKey }, 'Worker startup: OK');

  // Start healthcheck server (for Railway/Fly.io health checks)
  // Use PORT env var if set, otherwise default to 8080
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  startHealthcheckServer(port);

  while (true) {
    try {
      const pollResp = await pollJobs();

      if (pollResp.jobs && pollResp.jobs.length > 0) {
        // Process the first job only
        await processJob(pollResp.jobs[0]);
      } else {
        logger.debug('No jobs available, sleeping');
      }
    } catch (err) {
      const e = err as any;
      logger.error({ err: e, message: e?.message, stack: e?.stack }, 'Error in main loop');
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
main().catch((err) => {
  logger.fatal({ err }, 'Fatal error in main');
  process.exit(1);
});
