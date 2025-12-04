/**
 * Plugin Hooks System for Jekyll.js
 *
 * Provides a lifecycle hooks system allowing plugins to tap into various points
 * of the site build process. Modeled after Jekyll's hooks system:
 * @see https://jekyllrb.com/docs/plugins/hooks/
 *
 * Hook events follow Jekyll's naming conventions:
 * - :site, :after_init - After site initialization
 * - :site, :after_reset - After site is reset (for rebuilds)
 * - :site, :pre_render - Before rendering begins
 * - :site, :post_render - After all rendering is complete
 * - :site, :post_write - After all files are written
 * - :pages, :post_init - After pages are initialized
 * - :posts, :post_init - After posts are initialized
 * - :documents, :pre_render - Before a document is rendered
 * - :documents, :post_render - After a document is rendered
 * - :documents, :post_write - After a document is written
 */

import { Site } from '../core/Site';
import { Document } from '../core/Document';
import { Renderer } from '../core/Renderer';
import { logger } from '../utils/logger';

/**
 * Hook owner categories - what the hook operates on
 */
export type HookOwner = 'site' | 'pages' | 'posts' | 'documents';

/**
 * Hook event types
 */
export type HookEvent =
  | 'after_init'
  | 'after_reset'
  | 'pre_render'
  | 'post_render'
  | 'post_init'
  | 'post_write';

/**
 * Hook identifier combining owner and event
 */
export type HookIdentifier = `${HookOwner}:${HookEvent}`;

/**
 * Context passed to site-level hooks
 */
export interface SiteHookContext {
  /** The site instance */
  site: Site;
  /** The renderer instance (available after :site:after_init) */
  renderer?: Renderer;
}

/**
 * Context passed to document-level hooks
 */
export interface DocumentHookContext {
  /** The document being processed */
  document: Document;
  /** The site instance */
  site: Site;
  /** The renderer instance */
  renderer: Renderer;
  /** Rendered content (available in post_render and post_write hooks) */
  content?: string;
  /** Output path (available in post_write hooks) */
  outputPath?: string;
}

/**
 * Union type for all hook contexts
 */
export type HookContext = SiteHookContext | DocumentHookContext;

/**
 * Hook callback function type
 */
export type HookCallback<T extends HookContext = HookContext> = (
  context: T
) => void | Promise<void>;

/**
 * Registered hook with priority
 */
interface RegisteredHook {
  /** Hook callback function */
  callback: HookCallback;
  /** Plugin name that registered the hook */
  pluginName: string;
  /** Priority (lower numbers run first, default 50) */
  priority: number;
}

/**
 * Valid hook combinations supported by the system
 * Maps hook identifier to the expected context type
 */
export const VALID_HOOKS: Partial<Record<HookIdentifier, 'site' | 'document'>> = {
  'site:after_init': 'site',
  'site:after_reset': 'site',
  'site:pre_render': 'site',
  'site:post_render': 'site',
  'site:post_write': 'site',
  'pages:post_init': 'site',
  'posts:post_init': 'site',
  'documents:pre_render': 'document',
  'documents:post_render': 'document',
  'documents:post_write': 'document',
};

/**
 * Global hooks registry
 * Manages all registered hooks across the application
 */
class HooksRegistry {
  /** Map of hook identifiers to registered callbacks */
  private hooks: Map<HookIdentifier, RegisteredHook[]> = new Map();

  /**
   * Register a hook callback
   * @param owner Hook owner (site, pages, posts, documents)
   * @param event Hook event (after_init, pre_render, etc.)
   * @param callback Callback function
   * @param pluginName Name of the plugin registering the hook
   * @param priority Priority (lower numbers run first, default 50)
   */
  register(
    owner: HookOwner,
    event: HookEvent,
    callback: HookCallback,
    pluginName: string,
    priority: number = 50
  ): void {
    const hookId: HookIdentifier = `${owner}:${event}`;

    // Validate hook combination
    if (!VALID_HOOKS[hookId]) {
      logger.warn(
        `Invalid hook combination '${hookId}' registered by plugin '${pluginName}'. ` +
          `Valid hooks: ${Object.keys(VALID_HOOKS).join(', ')}`
      );
      return;
    }

    if (!this.hooks.has(hookId)) {
      this.hooks.set(hookId, []);
    }

    this.hooks.get(hookId)!.push({
      callback,
      pluginName,
      priority,
    });

    // Sort by priority (lower numbers first)
    this.hooks.get(hookId)!.sort((a, b) => a.priority - b.priority);

    logger.debug(`Registered hook ${hookId} from plugin '${pluginName}' with priority ${priority}`);
  }

  /**
   * Trigger all callbacks for a specific hook
   * @param owner Hook owner
   * @param event Hook event
   * @param context Context to pass to callbacks
   */
  async trigger<T extends HookContext>(
    owner: HookOwner,
    event: HookEvent,
    context: T
  ): Promise<void> {
    const hookId: HookIdentifier = `${owner}:${event}`;
    const registeredHooks = this.hooks.get(hookId);

    if (!registeredHooks || registeredHooks.length === 0) {
      return;
    }

    logger.debug(`Triggering hook ${hookId} (${registeredHooks.length} callbacks)`);

    for (const hook of registeredHooks) {
      try {
        await hook.callback(context);
      } catch (error) {
        logger.warn(
          `Error in hook ${hookId} from plugin '${hook.pluginName}': ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Get all registered hooks for a specific hook identifier
   * @param owner Hook owner
   * @param event Hook event
   * @returns Array of registered hooks
   */
  getHooks(owner: HookOwner, event: HookEvent): RegisteredHook[] {
    const hookId: HookIdentifier = `${owner}:${event}`;
    return this.hooks.get(hookId) || [];
  }

  /**
   * Check if any hooks are registered for a specific hook identifier
   * @param owner Hook owner
   * @param event Hook event
   * @returns True if hooks are registered
   */
  hasHooks(owner: HookOwner, event: HookEvent): boolean {
    const hookId: HookIdentifier = `${owner}:${event}`;
    const hooks = this.hooks.get(hookId);
    return hooks !== undefined && hooks.length > 0;
  }

  /**
   * Clear all registered hooks
   * Useful for testing
   */
  clear(): void {
    this.hooks.clear();
  }

  /**
   * Get all registered hook identifiers
   * @returns Array of hook identifiers with registered callbacks
   */
  getRegisteredHookIds(): HookIdentifier[] {
    return Array.from(this.hooks.keys()).filter((id) => {
      const hooks = this.hooks.get(id);
      return hooks && hooks.length > 0;
    });
  }
}

/**
 * Global hooks registry singleton
 */
export const Hooks = new HooksRegistry();

/**
 * Convenience class for plugins to register hooks with consistent plugin name
 */
export class PluginHooks {
  private pluginName: string;

  constructor(pluginName: string) {
    this.pluginName = pluginName;
  }

  /**
   * Register a site:after_init hook
   */
  onSiteAfterInit(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('site', 'after_init', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a site:after_reset hook
   */
  onSiteAfterReset(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('site', 'after_reset', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a site:pre_render hook
   */
  onSitePreRender(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('site', 'pre_render', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a site:post_render hook
   */
  onSitePostRender(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('site', 'post_render', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a site:post_write hook
   */
  onSitePostWrite(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('site', 'post_write', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a pages:post_init hook
   */
  onPagesPostInit(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('pages', 'post_init', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a posts:post_init hook
   */
  onPostsPostInit(callback: HookCallback<SiteHookContext>, priority?: number): void {
    Hooks.register('posts', 'post_init', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a documents:pre_render hook
   */
  onDocumentPreRender(callback: HookCallback<DocumentHookContext>, priority?: number): void {
    Hooks.register('documents', 'pre_render', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a documents:post_render hook
   */
  onDocumentPostRender(callback: HookCallback<DocumentHookContext>, priority?: number): void {
    Hooks.register('documents', 'post_render', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a documents:post_write hook
   */
  onDocumentPostWrite(callback: HookCallback<DocumentHookContext>, priority?: number): void {
    Hooks.register('documents', 'post_write', callback as HookCallback, this.pluginName, priority);
  }

  /**
   * Register a generic hook
   */
  on(owner: HookOwner, event: HookEvent, callback: HookCallback, priority?: number): void {
    Hooks.register(owner, event, callback, this.pluginName, priority);
  }
}
