import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { extname, join } from 'path';
import { readFile, stat } from 'fs/promises';
import chalk from 'chalk';
import { lookup as mimeTypeLookup } from 'mime-types';
import { Builder } from '../core';
import { Site } from '../core';
import { FileWatcher } from '../utils/watcher';
import { resolveUrlToFilePath, PathTraversalError } from '../utils/path-security';

export interface DevServerOptions {
  /**
   * Port to listen on
   */
  port: number;

  /**
   * Host to bind to
   */
  host: string;

  /**
   * Path to serve files from (destination directory)
   */
  destination: string;

  /**
   * Source directory to watch for changes
   */
  source: string;

  /**
   * Enable live reload
   */
  livereload: boolean;

  /**
   * Site instance for rebuilding
   */
  site: Site;

  /**
   * Builder instance for rebuilding
   */
  builder: Builder;

  /**
   * Enable verbose output
   */
  verbose?: boolean;
}

/**
 * MIME type lookup is now handled by the 'mime-types' library
 * which maintains a comprehensive database of MIME types
 */

/**
 * Development server with static file serving, file watching, and live reload
 */
export class DevServer {
  private httpServer: HttpServer | null = null;
  private wsServer: WebSocketServer | null = null;
  private fileWatcher: FileWatcher | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(private options: DevServerOptions) {}

  /**
   * Start the development server
   */
  async start(): Promise<void> {
    // Create HTTP server with wrapped async handler
    // The wrapper ensures any unhandled promise rejections result in a 500 error
    this.httpServer = createServer((req, res) => {
      this.handleRequest(req, res).catch((error) => {
        // This handles any unhandled rejections from the async handler
        console.error(chalk.red('[Server Error]'), error instanceof Error ? error.message : error);
        this.send500(res, error);
      });
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(this.options.port, this.options.host, () => {
        console.log(
          chalk.green('✓'),
          `Server running at http://${this.options.host}:${this.options.port}/`
        );
        console.log(chalk.gray('  Press Ctrl+C to stop'));
        resolve();
      });

      this.httpServer!.on('error', (error) => {
        reject(error);
      });
    });

    // Start WebSocket server for live reload
    if (this.options.livereload) {
      this.startLiveReload();
    }

    // Start file watcher
    this.startWatcher();
  }

  /**
   * Stop the development server
   */
  async stop(): Promise<void> {
    // Close WebSocket connections
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    // Close WebSocket server
    if (this.wsServer) {
      await new Promise<void>((resolve) => {
        this.wsServer!.close(() => resolve());
      });
      this.wsServer = null;
    }

    // Close file watcher
    if (this.fileWatcher) {
      await this.fileWatcher.stop();
      this.fileWatcher = null;
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }
  }

  /**
   * Start the WebSocket server for live reload
   */
  private startLiveReload(): void {
    this.wsServer = new WebSocketServer({ port: this.options.port + 1 });

    this.wsServer.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      if (this.options.verbose) {
        console.log(chalk.gray('[LiveReload] Client connected'));
      }
    });

    if (this.options.verbose) {
      console.log(
        chalk.gray(`[LiveReload] WebSocket server running on port ${this.options.port + 1}`)
      );
    }
  }

  /**
   * Start watching source files for changes
   */
  private startWatcher(): void {
    this.fileWatcher = new FileWatcher({
      source: this.options.source,
      destination: this.options.destination,
      builder: this.options.builder,
      verbose: this.options.verbose,
      onRebuild: () => {
        // Notify clients to reload after rebuild
        if (this.options.livereload) {
          this.notifyReload();
        }
      },
    });

    this.fileWatcher.start();
  }

  /**
   * Notify all connected clients to reload
   */
  private notifyReload(): void {
    const message = JSON.stringify({ type: 'reload' });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    if (this.options.verbose) {
      console.log(chalk.gray(`[LiveReload] Notified ${this.clients.size} clients`));
    }
  }

  /**
   * Handle HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = req.url || '/';

      // Securely resolve URL to file path, preventing directory traversal
      let filepath: string;
      try {
        filepath = this.resolveFilePath(url);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          // Log the attempt for security monitoring
          console.warn(chalk.red('[Security]'), `Path traversal attempt blocked: ${url}`);
          this.send403(res, url);
          return;
        }
        throw error;
      }

      if (this.options.verbose) {
        console.log(chalk.gray(`[${req.method}] ${url} -> ${filepath}`));
      }

      // Check if file exists
      const stats = await stat(filepath);

      if (stats.isDirectory()) {
        // Try index.html in directory
        filepath = join(filepath, 'index.html');
        await stat(filepath); // Will throw if doesn't exist
      }

      // Read and serve file
      const content = await readFile(filepath);
      const ext = extname(filepath);
      const mimeType = mimeTypeLookup(filepath) || 'application/octet-stream';

      // Inject live reload script for HTML files
      let responseContent: Buffer | string = content;
      if (this.options.livereload && ext === '.html') {
        responseContent = this.injectLiveReloadScript(content.toString());
      }

      // Check if connection is still open before sending response
      if (res.headersSent || res.writableEnded) {
        return;
      }

      try {
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': Buffer.byteLength(responseContent),
        });

        res.end(responseContent);
      } catch {
        // Ignore network errors when client has disconnected
      }
    } catch (_error) {
      // File not found or other error
      this.send404(res, req.url || '/');
    }
  }

  /**
   * Resolve URL to file path securely
   * @throws PathTraversalError if the URL attempts to escape the destination directory
   */
  private resolveFilePath(url: string): string {
    // Use secure URL to file path resolution that prevents directory traversal
    return resolveUrlToFilePath(this.options.destination, url);
  }

  /**
   * Send 403 Forbidden response
   */
  private send403(res: ServerResponse, url: string): void {
    // Don't send if headers already sent or connection closed
    if (res.headersSent || res.writableEnded) {
      return;
    }

    const escapedUrl = this.escapeHtml(url);
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>403 Forbidden</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { color: #dc3545; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>403 Forbidden</h1>
  <p>Access to <code>${escapedUrl}</code> is forbidden.</p>
</body>
</html>`;

    try {
      res.writeHead(403, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(content),
      });
      res.end(content);
    } catch {
      // Ignore network errors when client has disconnected
    }
  }

  /**
   * Send 404 response
   */
  private send404(res: ServerResponse, url: string): void {
    // Don't send if headers already sent or connection closed
    if (res.headersSent || res.writableEnded) {
      return;
    }

    const escapedUrl = this.escapeHtml(url);
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>404 Not Found</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { color: #dc3545; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>404 Not Found</h1>
  <p>The requested URL <code>${escapedUrl}</code> was not found on this server.</p>
</body>
</html>`;

    try {
      res.writeHead(404, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(content),
      });
      res.end(content);
    } catch {
      // Ignore network errors when client has disconnected
    }
  }

  /**
   * Send 500 Internal Server Error response
   */
  private send500(res: ServerResponse, error: unknown): void {
    // Don't send if headers already sent or connection closed
    if (res.headersSent || res.writableEnded) {
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const escapedMessage = this.escapeHtml(message);
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>500 Internal Server Error</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { color: #dc3545; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>500 Internal Server Error</h1>
  <p>An unexpected error occurred: <code>${escapedMessage}</code></p>
</body>
</html>`;

    try {
      res.writeHead(500, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(content),
      });
      res.end(content);
    } catch {
      // Ignore network errors when client has disconnected
    }
  }

  /**
   * Escape HTML special characters to prevent XSS attacks
   * Escapes &, <, >, ", and ' in that order to prevent double-escaping
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;') // Must be first to prevent double-escaping
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Inject live reload script into HTML
   */
  private injectLiveReloadScript(html: string): string {
    const script = `
<script>
(function() {
  const ws = new WebSocket('ws://${this.options.host}:${this.options.port + 1}');
  
  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'reload') {
      console.log('[LiveReload] Reloading page...');
      window.location.reload();
    }
  };
  
  ws.onclose = function() {
    console.log('[LiveReload] Connection closed. Retrying...');
    setTimeout(function() {
      window.location.reload();
    }, 1000);
  };
  
  console.log('[LiveReload] Connected');
})();
</script>`;

    // Try to inject before </body>, otherwise before </html>
    if (html.includes('</body>')) {
      return html.replace('</body>', `${script}\n</body>`);
    } else if (html.includes('</html>')) {
      return html.replace('</html>', `${script}\n</html>`);
    } else {
      return html + script;
    }
  }
}
