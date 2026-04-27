export const environment = {
  production: false,
  apiUrl: "https://hiyrnow-backend-786443796056.europe-west1.run.app",
  zoomClientId: 'your_zoom_client_id_here',
  zoomRedirectUri: 'http://localhost:4200/zoom-callback',
  googleClientId: 'your_google_client_id_here',
  googleRedirectUri: 'http://localhost:4200/google-callback',
  fcm: {
    enabled: false, // Set to true to enable FCM push notifications
    vapidPublicKey: '', // Add your VAPID public key here when enabling FCM
  },
  // Summit landing feature:
  // Use this to point the summit registration flow at a specific backend host.
  // If left empty/undefined, the frontend will fall back to `/api/summit/register`.
  // Example: summitApiBase: 'https://hiyrnow.in/api/summit/register'
  summitApiBase: '',
};