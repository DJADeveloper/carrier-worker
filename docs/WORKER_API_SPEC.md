# Worker API Specification

## Authentication

All requests to edge functions must include the header:
```
x-worker-key: <WORKER_API_KEY>
```

## Polling for Jobs

**Endpoint:** `POST /functions/v1/automation-poll`

**Request Body:**
```json
{
  "worker_id": "<WORKER_ID>",
  "carrier_names": ["tower_hill", "cypress"] (optional),
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

If `jobs` is empty, the worker should sleep and poll again.

## Job Processing

- Process the first job from the `jobs` array only
- Use `job.carrier_submission_id` (not `id`)
- Use `job.credentials.username` and `job.credentials.password` (plaintext)
- Access nested fields: `job.quote_request`, `job.client`, `job.property`, `job.coverages`, `job.loss_history`, `job.submission_overrides`

## Webhook Reporting

**Endpoint:** `POST /functions/v1/automation-webhook`

**Request Body:**
```json
{
  "worker_id": "<WORKER_ID>",
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

## Screenshots

- Do NOT upload to Supabase Storage
- Capture screenshots as PNG
- Include in webhook payload as base64-encoded strings:
  ```json
  {
    "step": "login_success",
    "base64": "<raw base64 string>",
    "content_type": "image/png"
  }
  ```

## Error Codes

Standard error codes:
- `LOGIN_FAILED` - Authentication failed
- `SESSION_EXPIRED` - Session expired
- `CAPTCHA_REQUIRED` - CAPTCHA challenge required
- `PORTAL_UNAVAILABLE` - Carrier portal unavailable
- `ELEMENT_NOT_FOUND` - Expected element not found
- `VALIDATION_ERROR` - Input validation error
- `QUOTE_DECLINED` - Quote was declined
- `TIMEOUT` - Operation timed out
- `UNKNOWN_ERROR` - Unhandled error
