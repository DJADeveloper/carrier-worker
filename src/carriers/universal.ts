import { Page } from 'playwright';
import { Job, CarrierResult, Screenshot } from './types';
import { takeScreenshotBase64 } from '../engine/playwright';
import { logger } from '../logger';
import { ErrorCode } from '../engine/errors';

export async function runUniversal(job: Job, page: Page): Promise<CarrierResult> {
  const screenshots: Screenshot[] = [];
  
  try {
    logger.info({ carrierSubmissionId: job.carrier_submission_id }, 'Starting Universal automation');

    // Placeholder implementation - returns PORTAL_UNAVAILABLE error
    await page.goto('https://example.com/universal-placeholder', {
      waitUntil: 'networkidle',
    });

    // Take screenshot before failing
    const screenshot = await takeScreenshotBase64(page, 'portal_check');
    screenshots.push(screenshot);

    return {
      status: 'FAILED',
      errorCode: ErrorCode.PORTAL_UNAVAILABLE,
      errorMessage: 'Universal carrier automation is not yet implemented. Portal structure may have changed.',
      screenshots,
    };
  } catch (error) {
    logger.error({ error, carrierSubmissionId: job.carrier_submission_id }, 'Universal automation failed');
    throw error;
  }
}
