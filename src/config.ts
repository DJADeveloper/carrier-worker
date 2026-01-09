import dotenv from 'dotenv';

dotenv.config();

export const config = {
  lovable: {
    baseUrl: process.env.LOVABLE_BASE_URL || '',
    workerApiKey: process.env.WORKER_API_KEY || '',
    workerId: process.env.WORKER_ID || process.env.WORKER_NAME || 'worker-1',
  },
  polling: {
    intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS || '300000', 10),
  },
  playwright: {
    headless: process.env.HEADLESS !== 'false',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
  },
};

// Validate required config
const requiredVars = [
  'LOVABLE_BASE_URL',
  'WORKER_API_KEY',
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
