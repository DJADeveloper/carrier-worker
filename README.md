# Carrier Worker

External Playwright worker service for Lovable (Supabase) automation. This service polls for automation jobs, executes carrier-specific scripts using Playwright, captures screenshots, and reports results back to the Lovable app.

## Architecture

The worker integrates with three Lovable edge functions:
- `POST /functions/v1/automation-submit` - Used by the app to queue jobs (not implemented in this repo)
- `POST /functions/v1/automation-poll` - Worker polls for queued jobs
- `POST /functions/v1/automation-webhook` - Worker reports status and results

## Features

- Polls for automation jobs from Lovable
- Executes carrier-specific automation scripts using Playwright
- Captures screenshots as base64-encoded PNG images
- Reports job status (RUNNING, COMPLETE, NEEDS_REVIEW, FAILED)
- Error normalization with standardized error codes
- Supports multiple carriers (Tower Hill, Cypress, Universal)
- Dockerized for easy deployment

## Project Structure

```
src/
  index.ts              # Main entry point with polling loop
  config.ts             # Configuration from environment variables
  logger.ts             # Pino logger configuration
  api/
    lovable.ts          # API client for Lovable edge functions
  engine/
    playwright.ts       # Playwright browser management
    errors.ts           # Error normalization
  carriers/
    types.ts            # TypeScript interfaces
    index.ts            # Carrier script router
    towerhill.ts        # Tower Hill implementation
    cypress.ts          # Cypress placeholder
    universal.ts        # Universal placeholder
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Lovable API Configuration
LOVABLE_BASE_URL=https://your-lovable-project.lovable.app
WORKER_API_KEY=your-shared-secret-key

# Worker Configuration
WORKER_NAME=worker-1

# Polling Configuration
POLL_INTERVAL_MS=5000
JOB_TIMEOUT_MS=300000

# Playwright Configuration
HEADLESS=true

# Supabase Configuration (optional, for future use)
SUPABASE_URL=https://your-project.supabase.co
```

### Required Variables

- `LOVABLE_BASE_URL` - Base URL for your Lovable project
- `WORKER_API_KEY` - Shared secret for authenticating with Lovable edge functions (sent as `x-worker-key` header)

### Optional Variables

- `WORKER_NAME` - Name identifier for this worker instance (default: `worker-1`)
- `WORKER_ID` - Unique identifier (falls back to `WORKER_NAME` if not set, then defaults to `worker-1`)
- `POLL_INTERVAL_MS` - Milliseconds between poll attempts (default: `5000`)
- `JOB_TIMEOUT_MS` - Maximum time to process a job (default: `300000` = 5 minutes)
- `HEADLESS` - Run browser in headless mode (default: `true`)
- `SUPABASE_URL` - Your Supabase project URL (optional, reserved for future use)
- `PORT` - Port for healthcheck endpoint (default: `8080`, auto-detected on Railway/Fly.io)
- `LOG_LEVEL` - Logging level (default: `info`)

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for containerized runs)

### Setup

1. Clone the repository:
```bash
cd carrier-worker
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
# Create .env file from the template below (or create manually)
cat > .env << 'EOF'
LOVABLE_BASE_URL=https://your-lovable-project.lovable.app
WORKER_API_KEY=your-shared-secret-key
WORKER_NAME=worker-1
POLL_INTERVAL_MS=5000
HEADLESS=true
SUPABASE_URL=https://your-project.supabase.co
EOF
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

5. Run the worker:
```bash
npm start
```

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

## Docker

### Build Image

```bash
docker build -t carrier-worker .
```

### Run Container

```bash
docker run --env-file .env carrier-worker
```

### Docker Compose

```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f
```

## Deployment

### Environment Variables Template

Create a `.env.example` file (or copy to `.env` for local development):

```env
# Lovable API Configuration
LOVABLE_BASE_URL=https://your-lovable-project.lovable.app
WORKER_API_KEY=your-shared-secret-key

# Worker Configuration
WORKER_NAME=worker-1

# Polling Configuration
POLL_INTERVAL_MS=5000

# Playwright Configuration
HEADLESS=true

# Supabase Configuration (optional, for future use)
SUPABASE_URL=https://your-project.supabase.co
```

### Railway (Docker Deploy)

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub repository
   - Select the `carrier-worker` repository

3. **Configure the service**:
   - Railway will automatically detect the `Dockerfile`
   - Ensure the service is set to use Docker

4. **Set environment variables** in Railway dashboard:
   - Go to your service → Variables tab
   - Add the following required variables:
     - `LOVABLE_BASE_URL` (required) - Your Lovable project base URL
     - `WORKER_API_KEY` (required) - Shared secret for authentication
   - Add optional variables:
     - `WORKER_NAME` (optional, defaults to `worker-1`)
     - `WORKER_ID` (optional, falls back to `WORKER_NAME` or `worker-1`)
     - `POLL_INTERVAL_MS` (optional, defaults to `5000`)
     - `JOB_TIMEOUT_MS` (optional, defaults to `300000`)
     - `HEADLESS` (optional, defaults to `true`)
     - `SUPABASE_URL` (optional)
     - `PORT` (optional, defaults to `8080` for healthcheck)

5. **Scale the service**:
   - Go to Settings → Scale
   - Set to 1 instance (workers run continuously)

6. **Deploy**:
   - Railway will automatically deploy when you push to your connected branch
   - Or click "Deploy" in the dashboard
   - Check logs to verify: `Worker startup: OK`

7. **Verify deployment**:
   - Check service logs for "Worker startup: OK"
   - Healthcheck endpoint available at `/health` (returns 200 OK)

### Fly.io (Docker Deploy)

1. **Install Fly CLI**:
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login to Fly**:
```bash
fly auth login
```

3. **Create a new app** (if not using existing `fly.toml`):
```bash
fly launch
```
   - When prompted:
     - App name: `carrier-worker` (or your preferred name)
     - Region: Choose closest region (e.g., `iad`, `ord`, `sjc`)
     - Don't deploy yet - we'll set secrets first

4. **Set environment variables (secrets)**:
```bash
# Required
fly secrets set LOVABLE_BASE_URL=https://your-lovable-project.lovable.app
fly secrets set WORKER_API_KEY=your-shared-secret-key

# Optional
fly secrets set WORKER_NAME=worker-1
fly secrets set WORKER_ID=worker-1
fly secrets set POLL_INTERVAL_MS=5000
fly secrets set JOB_TIMEOUT_MS=300000
fly secrets set HEADLESS=true
fly secrets set SUPABASE_URL=https://your-project.supabase.co
```

   Or set multiple at once:
```bash
fly secrets set \
  LOVABLE_BASE_URL=https://your-lovable-project.lovable.app \
  WORKER_API_KEY=your-shared-secret-key \
  WORKER_NAME=worker-1 \
  POLL_INTERVAL_MS=5000 \
  HEADLESS=true
```

5. **Configure the app** (if `fly.toml` already exists, skip to deploy):
   - The `fly.toml` file is already configured for a worker
   - It uses 1 CPU, 2GB RAM, and auto-restarts
   - Healthcheck is configured at `/health`

6. **Deploy**:
```bash
fly deploy
```

7. **Verify deployment**:
```bash
# Check status
fly status

# View logs
fly logs

# Verify healthcheck
fly curl http://carrier-worker.fly.dev/health
```

8. **Scale (if needed)**:
```bash
# Ensure machine is running (auto-starts, but verify)
fly scale count 1
```

### Deployment Notes

- **Healthcheck**: Both platforms use the `/health` endpoint which returns `{ status: "ok", service: "carrier-worker" }`
- **Port**: The worker exposes port 8080 (or `PORT` env var) for health checks only
- **Auto-restart**: Both platforms auto-restart the worker if it crashes
- **Scaling**: Run 1 instance per worker. For multiple workers, use different `WORKER_ID`/`WORKER_NAME` values
- **Logs**: Check logs regularly to monitor job processing and errors

## API Contract

See `docs/WORKER_API_SPEC.md` for the complete API specification.

### Polling for Jobs

The worker calls `POST /functions/v1/automation-poll` with header `x-worker-key`.

**Request Body:**
```json
{
  "worker_id": "worker-1",
  "carrier_names": ["tower_hill"] (optional),
  "limit": 1
}
```

**Response:**
```json
{
  "jobs": [
    {
      "carrier_submission_id": "string",
      "carrier_name": "string",
      "credentials": {
        "username": "string",
        "password": "string"
      },
      "quote_request": {},
      "client": {},
      "property": {},
      "coverages": {},
      "loss_history": {},
      "submission_overrides": {}
    }
  ]
}
```

If `jobs` is empty, the worker sleeps and polls again. The worker processes the first job from the array.

### Sending Webhooks

The worker calls `POST /functions/v1/automation-webhook` with header `x-worker-key`.

**Request Body:**
```json
{
  "worker_id": "worker-1",
  "carrier_submission_id": "string",
  "status": "RUNNING" | "NEEDS_REVIEW" | "FAILED" | "COMPLETE",
  "last_step": "string" (required for RUNNING),
  "error_code": "string" (required for FAILED),
  "error_message": "string" (optional for FAILED),
  "needs_review_fields": [] (required for NEEDS_REVIEW),
  "quote_result": {} (required for COMPLETE),
  "screenshots": [
    {
      "step": "string",
      "base64": "string",
      "content_type": "image/png"
    }
  ]
}
```

## Carrier Scripts

### Tower Hill

Currently implemented as a stub that demonstrates the flow:
- Navigates to placeholder URL
- Checks for required `roof_year` field in `job.property` or `job.submission_overrides`
- Returns `NEEDS_REVIEW` if missing, with a dynamic question
- Returns `COMPLETE` with mocked quote result if all fields present
- Captures screenshots as base64-encoded PNG images

### Cypress & Universal

Placeholder implementations that return `FAILED` with `PORTAL_UNAVAILABLE` error code.

## Error Codes

The worker normalizes errors into standardized codes:

- `LOGIN_FAILED` - Authentication failed
- `SESSION_EXPIRED` - Session expired
- `CAPTCHA_REQUIRED` - CAPTCHA challenge required
- `PORTAL_UNAVAILABLE` - Carrier portal unavailable
- `ELEMENT_NOT_FOUND` - Expected element not found
- `VALIDATION_ERROR` - Input validation error
- `QUOTE_DECLINED` - Quote was declined
- `TIMEOUT` - Operation timed out
- `UNKNOWN_ERROR` - Unhandled error

## Screenshots

Screenshots are captured as PNG images and included in webhook payloads as base64-encoded strings. They are NOT uploaded to Supabase Storage. Each screenshot includes:
- `step`: Descriptive step name (e.g., "login_success", "quote_complete")
- `base64`: Base64-encoded PNG image data
- `content_type`: "image/png"

## Logging

The worker uses [Pino](https://getpino.io/) for structured logging. In development, logs are prettified. In production, logs are in JSON format.

Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

## Troubleshooting

### Worker not polling

- Check that `LOVABLE_BASE_URL` and `WORKER_API_KEY` are correct
- Verify the edge function `/functions/v1/automation-poll` is accessible
- Check logs for authentication errors

### Screenshots not included in webhooks

- Screenshots are base64-encoded and included directly in webhook payloads
- Check that screenshots are being captured in carrier scripts
- Verify webhook payload includes the `screenshots` array

### Jobs timing out

- Increase `JOB_TIMEOUT_MS` if jobs are complex
- Check network connectivity to carrier portals
- Review logs for specific step that's timing out

## License

ISC
