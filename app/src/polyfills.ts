import 'zone.js';  // Required for Angular

// Browser polyfills
(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
};

// Optional: Add any other browser polyfills needed for your application