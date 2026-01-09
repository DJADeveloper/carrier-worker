import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { logger } from '../logger';

export interface BrowserOptions {
  headless?: boolean;
  timeout?: number;
}

export async function withBrowser<T>(
  options: BrowserOptions,
  fn: (page: Page) => Promise<T>
): Promise<T> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch({
      headless: options.headless ?? true,
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();
    
    if (options.timeout) {
      page.setDefaultTimeout(options.timeout);
    }

    return await fn(page);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (err) {
        logger.warn({ err }, 'Error closing page');
      }
    }
    if (context) {
      try {
        await context.close();
      } catch (err) {
        logger.warn({ err }, 'Error closing context');
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        logger.warn({ err }, 'Error closing browser');
      }
    }
  }
}

export async function takeScreenshotBase64(page: Page, step: string): Promise<{ step: string; base64: string; content_type: 'image/png' }> {
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: true,
  });
  
  const base64 = screenshot.toString('base64');
  
  return {
    step,
    base64,
    content_type: 'image/png',
  };
}
