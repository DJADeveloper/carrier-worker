export interface Job {
  carrier_submission_id: string;
  carrier_name: string;
  credentials: {
    username: string;
    password: string;
  };
  quote_request: any;
  client: any;
  property: any;
  coverages: any;
  loss_history: any;
  submission_overrides: any;
}

export interface NeedsReviewField {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: string[];
  value?: any;
}

export interface QuoteResult {
  premium_annual: number;
  term_months: number;
  quote_number: string;
  key_coverages_json: Record<string, any>;
  deductibles_json: Record<string, any>;
  underwriting_notes?: string;
}

export interface Screenshot {
  step: string;
  base64: string;
  content_type: 'image/png';
}

export interface CarrierResult {
  status: 'COMPLETE' | 'NEEDS_REVIEW' | 'FAILED';
  errorCode?: string;
  errorMessage?: string;
  needsReviewFields?: NeedsReviewField[];
  quoteResult?: QuoteResult;
  screenshots: Screenshot[];
}

export interface CarrierScript {
  run(job: Job, page: any): Promise<CarrierResult>;
}
