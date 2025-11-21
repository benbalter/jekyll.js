/**
 * Paginator module for Jekyll.js
 * Handles pagination logic for posts and collections
 * @see https://jekyllrb.com/docs/pagination/
 */

import { Document } from './Document';
import { JekyllConfig } from '../config';

/**
 * Paginator interface representing pagination state for a single page
 * This matches Jekyll's paginator object available in templates
 */
export interface Paginator {
  /** Posts on the current page */
  posts: Document[];
  
  /** Total number of posts across all pages */
  total_posts: number;
  
  /** Total number of pages */
  total_pages: number;
  
  /** Current page number (1-indexed) */
  page: number;
  
  /** Number of posts per page */
  per_page: number;
  
  /** Previous page number (null if on first page) */
  previous_page: number | null;
  
  /** Next page number (null if on last page) */
  next_page: number | null;
  
  /** Path to previous page (null if on first page) */
  previous_page_path: string | null;
  
  /** Path to next page (null if on last page) */
  next_page_path: string | null;
}

/**
 * Generate pagination for posts
 * @param posts All posts to paginate (should be pre-filtered and sorted)
 * @param config Jekyll configuration
 * @returns Array of paginator objects, one per page
 */
export function generatePagination(
  posts: Document[],
  config: JekyllConfig
): Paginator[] {
  // Check if pagination is enabled
  const perPage = config.paginate;
  if (!perPage || perPage <= 0) {
    return [];
  }
  
  // Calculate total pages
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / perPage);
  
  // Get pagination path pattern (default: /page:num/)
  const paginatePath = config.paginate_path || '/page:num/';
  
  // Generate paginator for each page
  const paginators: Paginator[] = [];
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const startIdx = (pageNum - 1) * perPage;
    const endIdx = Math.min(startIdx + perPage, totalPosts);
    const pagePosts = posts.slice(startIdx, endIdx);
    
    // Generate page paths
    const previousPath = pageNum > 1 
      ? generatePagePath(pageNum - 1, paginatePath, config.baseurl)
      : null;
    const nextPath = pageNum < totalPages 
      ? generatePagePath(pageNum + 1, paginatePath, config.baseurl)
      : null;
    
    paginators.push({
      posts: pagePosts,
      total_posts: totalPosts,
      total_pages: totalPages,
      page: pageNum,
      per_page: perPage,
      previous_page: pageNum > 1 ? pageNum - 1 : null,
      next_page: pageNum < totalPages ? pageNum + 1 : null,
      previous_page_path: previousPath,
      next_page_path: nextPath,
    });
  }
  
  return paginators;
}

/**
 * Generate path for a specific page number
 * @param pageNum Page number (1-indexed)
 * @param paginatePath Pagination path pattern from config
 * @param baseurl Base URL from config
 * @returns Generated path for the page
 */
function generatePagePath(
  pageNum: number,
  paginatePath: string,
  baseurl?: string
): string {
  const base = baseurl || '';
  
  // First page goes to root (/) or baseurl
  if (pageNum === 1) {
    return base + '/';
  }
  
  // Replace :num placeholder with page number
  const path = paginatePath.replace(':num', String(pageNum));
  
  // Ensure path starts with / and ends with /
  let normalizedPath = path;
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  if (!normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath + '/';
  }
  
  return base + normalizedPath;
}

/**
 * Get the file path for a paginated page
 * @param pageNum Page number (1-indexed)
 * @param paginatePath Pagination path pattern from config
 * @returns File path relative to destination directory
 */
export function getPaginatedFilePath(
  pageNum: number,
  paginatePath: string
): string {
  // First page goes to index.html
  if (pageNum === 1) {
    return 'index.html';
  }
  
  // Replace :num placeholder with page number
  let path = paginatePath.replace(':num', String(pageNum));
  
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  // Remove trailing slash if present
  if (path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  
  // Ensure it ends with /index.html
  if (path.endsWith('.html') || path.endsWith('.htm')) {
    return path;
  }
  
  return path + '/index.html';
}
