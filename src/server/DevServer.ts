import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { resolve, join, extname } from 'path';
import { readFile, stat } from 'fs/promises';
import chalk from 'chalk';
import { lookup as mimeTypeLookup } from 'mime-types';
import { Builder } from '../core';
import { Site } from '../core';
import { FileWatcher } from '../utils/watcher';

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
    // Create HTTP server
    this.httpServer = createServer(this.handleRequest.bind(this));

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
      let filepath = this.resolveFilePath(url);

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

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': Buffer.byteLength(responseContent),
      });

      res.end(responseContent);
    } catch (error) {
      // File not found or other error
      this.send404(res, req.url || '/');
    }
  }

  /**
   * Resolve URL to file path
   */
  private resolveFilePath(url: string): string {
    // Remove query string
    const cleanUrl = url.split('?')[0] || '/';
    
    // Resolve to destination directory
    const filepath = join(this.options.destination, cleanUrl);
    
    return resolve(filepath);
  }

  /**
   * Send 404 response
   */
  private send404(res: ServerResponse, url: string): void {
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
  <p>The requested URL <code>${url}</code> was not found on this server.</p>
</body>
</html>`;

    res.writeHead(404, {
      'Content-Type': 'text/html',
      'Content-Length': content.length,
    });
    res.end(content);
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
