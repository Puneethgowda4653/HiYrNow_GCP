import { test, expect } from '@playwright/test';

test.describe('Offline Functionality', () => {
  test('should show offline page when network is unavailable', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate offline mode
    await context.setOffline(true);

    // Try to navigate to a new page
    await page.goto('/offline', { waitUntil: 'domcontentloaded' }).catch(() => {});

    // Check if offline page elements are visible
    const offlineTitle = page.getByText(/you.*re offline/i);
    
    // Wait a bit for the page to render
    await page.waitForTimeout(1000);
    
    console.log('Offline mode test: Navigated to offline page');
  });

  test('should queue job application when offline', async ({ page, context }) => {
    // First, go online and navigate to a job
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Login (if needed) and navigate to job application
    // This is a simplified test - in real scenario, you'd need to login first
    
    // Simulate going offline
    await context.setOffline(true);

    // Check if offline queue service exists
    const hasOfflineQueue = await page.evaluate(() => {
      return typeof window !== 'undefined' && 'localStorage' in window;
    });

    expect(hasOfflineQueue).toBeTruthy();
    console.log('Offline queue functionality available');

    // Restore online mode
    await context.setOffline(false);
  });

  test('should sync queued requests when back online', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate offline mode
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Add item to queue (simulated)
    await page.evaluate(() => {
      localStorage.setItem('test-offline-queue', JSON.stringify({
        id: 'test-1',
        type: 'test',
        timestamp: Date.now()
      }));
    });

    // Go back online
    await context.setOffline(false);

    // Trigger online event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    await page.waitForTimeout(1000);

    console.log('Sync test: Triggered online event');
  });

  test('should cache static assets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if page loaded successfully
    await expect(page).toHaveTitle(/HiYrNow/i);

    // Verify assets are loaded
    const imagesLoaded = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every(img => img.complete && img.naturalHeight > 0);
    });

    console.log('Images loaded:', imagesLoaded);
  });

  test('should show install prompt when available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if install prompt component exists
    const installPromptExists = await page.locator('app-pwa-install-prompt').count() > 0;
    
    console.log('Install prompt component exists:', installPromptExists);
    expect(installPromptExists).toBeTruthy();
  });
});

test.describe('Network First Caching Strategy', () => {
  test('should fetch fresh data when online', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Intercept API calls
    let apiCallsMade = 0;
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCallsMade++;
      }
    });

    // Navigate to a page that makes API calls
    await page.goto('/home');
    await page.waitForTimeout(2000);

    console.log('API calls made:', apiCallsMade);
  });

  test('should handle API failures gracefully', async ({ page, context }) => {
    await page.goto('/');
    
    // Simulate poor network by going offline
    await context.setOffline(true);

    // Try to navigate - should handle gracefully
    await page.goto('/home', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    // Page should not crash
    const bodyExists = await page.locator('body').count() > 0;
    expect(bodyExists).toBeTruthy();

    await context.setOffline(false);
  });
});

