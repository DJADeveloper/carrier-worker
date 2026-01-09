export enum ErrorCode {
  LOGIN_FAILED = 'LOGIN_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  PORTAL_UNAVAILABLE = 'PORTAL_UNAVAILABLE',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  QUOTE_DECLINED = 'QUOTE_DECLINED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AutomationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AutomationError';
  }
}

export function normalizeError(error: unknown): { code: ErrorCode; message: string } {
  if (error instanceof AutomationError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return { code: ErrorCode.TIMEOUT, message: error.message };
    }
    
    if (message.includes('login') || message.includes('authentication')) {
      return { code: ErrorCode.LOGIN_FAILED, message: error.message };
    }
    
    if (message.includes('session') && message.includes('expired')) {
      return { code: ErrorCode.SESSION_EXPIRED, message: error.message };
    }
    
    if (message.includes('captcha')) {
      return { code: ErrorCode.CAPTCHA_REQUIRED, message: error.message };
    }
    
    if (message.includes('portal') && (message.includes('unavailable') || message.includes('down'))) {
      return { code: ErrorCode.PORTAL_UNAVAILABLE, message: error.message };
    }
    
    if (message.includes('element') && message.includes('not found')) {
      return { code: ErrorCode.ELEMENT_NOT_FOUND, message: error.message };
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return { code: ErrorCode.VALIDATION_ERROR, message: error.message };
    }
    
    if (message.includes('quote') && message.includes('declined')) {
      return { code: ErrorCode.QUOTE_DECLINED, message: error.message };
    }
  }

  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: error instanceof Error ? error.message : String(error),
  };
}
