# HiYrNow PWA - Quick Reference

## 🚀 Production Build & Test

```bash
# Build
npm run build:prod

# Serve
cd dist/app && npx http-server -p 8080

# Open
http://localhost:8080
```

## 🧪 Testing

```bash
# E2E Tests
npm run test:e2e              # Headless
npm run test:e2e:headed       # With browser
npm run test:e2e:ui           # Interactive UI

# Lighthouse Audit
npm run lighthouse

# Generate Icons
npm run generate-icons
```

## 🔧 Configuration Files

- `src/manifest.json` - PWA manifest
- `src/ngsw-config.json` - Service worker caching
- `src/environments/environment.ts` - FCM config (dev)
- `src/environments/environment.prod.ts` - FCM config (prod)

## 📱 PWA Features

### 1. Offline Queue
```typescript
import { OfflineQueueService } from '@app/services/offline-queue.service';

// Save offline
await this.offlineQueue.saveJobApplicationOffline(jobId, data, apiUrl);

// Get pending
const pending = await this.offlineQueue.getPendingJobApplications();

// Manual sync
await this.offlineQueue.syncQueue();

// Subscribe to status
this.offlineQueue.syncStatus$.subscribe(status => {
  console.log('Online:', status.isOnline);
  console.log('Queue:', status.queueLength);
});
```

### 2. Install Prompt
```typescript
import { PwaService } from '@app/services/pwa.service';

// Check if installable
const canInstall = this.pwaService.canInstall();

// Trigger install
await this.pwaService.installPwa();

// Check if installed
const isInstalled = this.pwaService.isInstalled();
```

### 3. Push Notifications (Optional)
```typescript
import { PushNotificationService } from '@app/services/push-notification.service';

// Subscribe
await this.pushService.subscribeToNotifications();

// Check status
const isSubscribed = await this.pushService.isSubscribed();

// Unsubscribe
await this.pushService.unsubscribe();
```

## 🔐 Enable FCM

Edit `src/environments/environment.ts`:
```typescript
fcm: {
  enabled: true,
  vapidPublicKey: 'YOUR_VAPID_KEY_HERE'
}
```

## 📊 Lighthouse Scores

**Target:** ≥90 on all metrics

Run audit:
```bash
npm run build:prod
cd dist/app && npx http-server -p 8080
npm run lighthouse
```

## 🐛 Troubleshooting

**Service Worker Not Working?**
- Build with production config (`npm run build:prod`)
- Service worker disabled in dev mode
- Check DevTools → Application → Service Workers

**Offline Not Working?**
- Verify service worker is active
- Check cache in DevTools → Application → Cache Storage
- Test in production build only

**Install Prompt Not Showing?**
- Must use HTTPS or localhost
- Manifest must be valid
- Check DevTools → Application → Manifest

## 📚 Full Documentation

See `/PWA_IMPLEMENTATION_GUIDE.md` in project root for:
- Complete setup instructions
- FCM configuration guide
- Capacitor integration
- Troubleshooting
- API documentation

## 🎯 Quick Checks

```bash
# Verify build passes
npm run build:prod

# Check service worker generated
ls dist/app/ngsw-worker.js

# Check manifest copied
ls dist/app/manifest.json

# Check icons generated
ls src/assets/icons/
```

## 🔗 Components

- **Install Prompt:** `components/pwa-install-prompt/`
- **Offline Page:** `components/offline-page/`
- **PWA Service:** `services/pwa.service.ts`
- **Offline Queue:** `services/offline-queue.service.ts`
- **Push Notifications:** `services/push-notification.service.ts`

---

**Branch:** `feat/pwa`  
**Status:** ✅ Production Ready

