import { Job, QuoteResult, Screenshot } from './types';
import { takeScreenshotBase64 } from '../engine/playwright';
import { logger } from '../logger';

/**
 * Generate a deterministic hash from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic premium based on carrier name and submission ID
 */
function generateDeterministicPremium(carrierName: string, submissionId: string): number {
  const hash = hashString(`${carrierName}-${submissionId}`);
  // Generate premium between $800 and $3500, deterministic based on hash
  const basePremium = 800;
  const range = 2700;
  const premium = basePremium + (hash % range);
  // Round to 2 decimal places
  return Math.round(premium * 100) / 100;
}

/**
 * Get carrier code from carrier name
 */
function getCarrierCode(carrierName: string): string {
  const normalized = carrierName.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Extract first 2-4 meaningful characters
  if (normalized.includes('tower')) return 'TH';
  if (normalized.includes('cypress')) return 'CY';
  if (normalized.includes('universal')) return 'UN';
  // Default: first 2 uppercase letters
  return normalized.substring(0, 2).toUpperCase().padEnd(2, 'X');
}

/**
 * Generate quote number: ${carrierCode}-${YYYY}-<last6 of submission_id>
 */
function generateQuoteNumber(carrierName: string, submissionId: string): string {
  const carrierCode = getCarrierCode(carrierName);
  const year = new Date().getFullYear();
  const last6 = submissionId.slice(-6).toUpperCase();
  return `${carrierCode}-${year}-${last6}`;
}

/**
 * Derive deductibles from job coverages
 */
function deriveDeductibles(coverages: any): Record<string, any> {
  const deductibles: Record<string, any> = {};
  
  // Set AOP (All Other Perils) deductible
  if (coverages?.aop !== undefined) {
    deductibles.aop = coverages.aop;
  } else {
    deductibles.aop = 1000; // Default
  }
  
  // Set wind/hail deductible
  if (coverages?.wind_hail !== undefined) {
    deductibles.wind_hail = coverages.wind_hail;
  } else {
    deductibles.wind_hail = 1000; // Default
  }
  
  // Always set hurricane to 2%
  deductibles.hurricane = '2%';
  
  return deductibles;
}

/**
 * Derive key coverages from job coverages
 */
function deriveKeyCoverages(coverages: any): Record<string, any> {
  const keyCoverages: Record<string, any> = {};
  
  // Map common coverage fields
  if (coverages?.cov_a !== undefined) keyCoverages.dwelling = coverages.cov_a;
  if (coverages?.cov_b !== undefined) keyCoverages.other_structures = coverages.cov_b;
  if (coverages?.cov_c !== undefined) keyCoverages.personal_property = coverages.cov_c;
  if (coverages?.cov_d !== undefined) keyCoverages.loss_of_use = coverages.cov_d;
  if (coverages?.liability !== undefined) keyCoverages.liability = coverages.liability;
  if (coverages?.medpay !== undefined) keyCoverages.medical_payments = coverages.medpay;
  
  // If no coverages provided, set defaults
  if (Object.keys(keyCoverages).length === 0) {
    keyCoverages.dwelling = 500000;
    keyCoverages.other_structures = 50000;
    keyCoverages.personal_property = 250000;
    keyCoverages.loss_of_use = 100000;
    keyCoverages.liability = 300000;
    keyCoverages.medical_payments = 5000;
  }
  
  return keyCoverages;
}

/**
 * Generate a simulated quote result
 */
export function generateSimulatedQuote(job: Job): QuoteResult {
  const premium = generateDeterministicPremium(job.carrier_name, job.carrier_submission_id);
  const quoteNumber = generateQuoteNumber(job.carrier_name, job.carrier_submission_id);
  const deductibles = deriveDeductibles(job.coverages);
  const keyCoverages = deriveKeyCoverages(job.coverages);
  
  return {
    premium_annual: premium,
    term_months: 12,
    quote_number: quoteNumber,
    deductibles_json: deductibles,
    key_coverages_json: keyCoverages,
    underwriting_notes: 'Simulated quote (no credentials).',
  };
}

/**
 * Generate a screenshot for simulation (optional)
 */
export async function generateSimulationScreenshot(
  job: Job,
  quoteResult: QuoteResult,
  page: any
): Promise<Screenshot | null> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
            .info { margin: 15px 0; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; margin-left: 10px; }
            .quote-number { font-size: 24px; color: #4CAF50; margin: 20px 0; }
            .premium { font-size: 32px; color: #2196F3; font-weight: bold; margin: 20px 0; }
            .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }
            .section h2 { margin-top: 0; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Simulated Quote Summary</h1>
            <div class="info">
              <span class="label">Carrier:</span>
              <span class="value">${job.carrier_name}</span>
            </div>
            <div class="info">
              <span class="label">Submission ID:</span>
              <span class="value">${job.carrier_submission_id}</span>
            </div>
            <div class="quote-number">Quote #: ${quoteResult.quote_number}</div>
            <div class="premium">$${quoteResult.premium_annual.toFixed(2)} / year</div>
            <div class="section">
              <h2>Coverages</h2>
              ${Object.entries(quoteResult.key_coverages_json).map(([key, value]) => 
                `<div class="info"><span class="label">${key}:</span><span class="value">$${typeof value === 'number' ? value.toLocaleString() : value}</span></div>`
              ).join('')}
            </div>
            <div class="section">
              <h2>Deductibles</h2>
              ${Object.entries(quoteResult.deductibles_json).map(([key, value]) => 
                `<div class="info"><span class="label">${key}:</span><span class="value">${typeof value === 'number' ? '$' + value.toLocaleString() : value}</span></div>`
              ).join('')}
            </div>
            <div class="info" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
              <span class="label">Note:</span>
              <span class="value">${quoteResult.underwriting_notes}</span>
            </div>
          </div>
        </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle' });
    const screenshot = await takeScreenshotBase64(page, 'quote_summary');
    return screenshot;
  } catch (err) {
    logger.warn({ err }, 'Failed to generate simulation screenshot, continuing without it');
    return null;
  }
}
