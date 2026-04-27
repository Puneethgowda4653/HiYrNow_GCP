import 'zone.js/node';
import { enableProdMode } from '@angular/core';
import { ngExpressEngine } from '@nguniversal/express-engine';
import express, { Request, Response } from 'express';
import { join } from 'path';
import { AppServerModule } from './src/app/app.server.module';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';

enableProdMode();

export function app(): express.Express {
  const server = express();
  // Changed from dist/app/browser to dist/app
  const distFolder = join(process.cwd(), 'dist/app');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) 
    ? 'index.original.html' 
    : 'index.html';

  // Our Universal express-engine
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
    providers: [
      { provide: APP_BASE_HREF, useValue: '' }
    ]
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Serve static files from the correct directory
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req: Request, res: Response) => {
    res.render(indexHtml, { 
      req,
      providers: [
        { provide: APP_BASE_HREF, useValue: req.baseUrl }
      ]
    });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 8080;
  const server = app();

  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';





