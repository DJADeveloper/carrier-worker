import { Page } from 'playwright';
import { Job, CarrierResult, NeedsReviewField, QuoteResult, Screenshot } from './types';
import { takeScreenshotBase64 } from '../engine/playwright';
import { logger } from '../logger';

export async function runTowerHill(job: Job, page: Page): Promise<CarrierResult> {
  const screenshots: Screenshot[] = [];
  
  try {
    logger.info({ carrierSubmissionId: job.carrier_submission_id }, 'Starting Tower Hill automation');

    // Use credentials directly from job
    logger.info({ username: job.credentials.username }, 'Using credentials from job');

    // Navigate to placeholder URL (no real portal yet)
    await page.goto('https://example.com/towerhill-placeholder', {
      waitUntil: 'networkidle',
    });

    // Take initial screenshot
    const screenshot1 = await takeScreenshotBase64(page, 'initial');
    screenshots.push(screenshot1);

    // Check for required fields - check property and submission_overrides
    const roofYear = job.property?.roof_year || job.submission_overrides?.roof_year;
    
    if (!roofYear) {
      logger.info({ carrierSubmissionId: job.carrier_submission_id }, 'Missing roof_year, returning NEEDS_REVIEW');
      
      const needsReviewFields: NeedsReviewField[] = [
        {
          field: 'roof_year',
          label: 'Roof Year',
          type: 'number',
          required: true,
        },
      ];

      return {
        status: 'NEEDS_REVIEW',
        needsReviewFields,
        screenshots,
      };
    }

    // Simulate quote generation
    logger.info({ carrierSubmissionId: job.carrier_submission_id, roofYear }, 'Generating quote');

    // Take final screenshot
    const screenshot2 = await takeScreenshotBase64(page, 'quote_complete');
    screenshots.push(screenshot2);

    // Return mocked quote result
    const quoteResult: QuoteResult = {
      premium_annual: 1250.00,
      term_months: 12,
      quote_number: `TH-${Date.now()}`,
      key_coverages_json: {
        dwelling: 500000,
        personal_property: 250000,
        liability: 300000,
        medical_payments: 5000,
      },
      deductibles_json: {
        wind_hail: 2,
        all_other_perils: 1000,
      },
      underwriting_notes: 'Quote generated successfully. All coverages meet standard requirements.',
    };

    logger.info({ carrierSubmissionId: job.carrier_submission_id }, 'Tower Hill automation completed successfully');

    return {
      status: 'COMPLETE',
      quoteResult,
      screenshots,
    };
  } catch (error) {
    logger.error({ error, carrierSubmissionId: job.carrier_submission_id }, 'Tower Hill automation failed');
    
    // Try to capture error screenshot
    try {
      const errorScreenshot = await takeScreenshotBase64(page, 'error');
      screenshots.push(errorScreenshot);
    } catch (screenshotError) {
      logger.warn({ screenshotError }, 'Failed to capture error screenshot');
    }

    throw error;
  }
}
