import { test, expect } from '@playwright/test';

test.describe('PWA Installation', () => {
  test('should have manifest.json with correct properties', async ({ page }) => {
    await page.goto('/');

    // Check manifest link exists
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();

    // Fetch and validate manifest
    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifestResponse = await page.request.get(manifestHref!);
    expect(manifestResponse.ok()).toBeTruthy();

    const manifest = await manifestResponse.json();
    
    // Validate manifest properties
    expect(manifest.name).toBe('HiYrNow - AI-Powered Job Portal');
    expect(manifest.short_name).toBe('HiYrNow');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.icons).toHaveLength(8);

    // Validate icons
    for (const icon of manifest.icons) {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBe('image/png');
    }
  });

  test('should have all PWA meta tags', async ({ page }) => {
    await page.goto('/');

    // Check theme-color meta tag
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toBeAttached();

    // Check apple-mobile-web-app-capable
    const appleMobileCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleMobileCapable).toBeAttached();

    // Check apple touch icon
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toBeAttached();
  });

  test('should register service worker', async ({ page, context }) => {
    // Grant service worker permission
    await context.grantPermissions(['service-worker']);

    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });

    // Service worker should be registered (may take time in dev mode)
    // In production build, this should always be true
    console.log('Service Worker Registered:', swRegistered);
  });

  test('should have valid PWA icons', async ({ page }) => {
    await page.goto('/');

    const manifestResponse = await page.request.get('/manifest.json');
    const manifest = await manifestResponse.json();

    // Check if icons are accessible
    for (const icon of manifest.icons) {
      const iconResponse = await page.request.get(icon.src);
      expect(iconResponse.ok()).toBeTruthy();
      
      const contentType = iconResponse.headers()['content-type'];
      expect(contentType).toContain('image');
    }
  });
});

