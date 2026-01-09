import { Page } from 'playwright';
import { Job, CarrierResult } from './types';
import { runTowerHill } from './towerhill';
import { runCypress } from './cypress';
import { runUniversal } from './universal';
import { logger } from '../logger';

export async function runCarrierScript(job: Job, page: Page): Promise<CarrierResult> {
  const carrierName = job.carrier_name.toLowerCase().replace(/\s+/g, '');
  
  logger.info({ carrierName, carrierSubmissionId: job.carrier_submission_id }, 'Running carrier script');

  switch (carrierName) {
    case 'towerhill':
    case 'tower_hill':
    case 'tower-hill':
      return await runTowerHill(job, page);
    
    case 'cypress':
      return await runCypress(job, page);
    
    case 'universal':
      return await runUniversal(job, page);
    
    default:
      throw new Error(`Unknown carrier: ${job.carrier_name}`);
  }
}
