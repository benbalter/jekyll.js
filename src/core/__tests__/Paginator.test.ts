/**
 * Tests for Paginator module
 */

import { generatePagination, getPaginatedFilePath } from '../Paginator';
import { Document, DocumentType } from '../Document';
import { JekyllConfig } from '../../config';

describe('Paginator', () => {
  describe('generatePagination', () => {
    // Helper function to create mock Document objects
    const createMockDocument = (index: number): Document => {
      const doc = {
        path: `/test/_posts/2024-01-${String(index + 1).padStart(2, '0')}-post-${index + 1}.md`,
        relativePath: `_posts/2024-01-${String(index + 1).padStart(2, '0')}-post-${index + 1}.md`,
        type: DocumentType.POST,
        index, // For tracking in tests
      } as any;
      return doc as Document;
    };

    it('should return empty array when pagination is disabled', () => {
      const posts: Document[] = [];
      const config: JekyllConfig = {};
      
      const result = generatePagination(posts, config);
      
      expect(result).toEqual([]);
    });

    it('should return empty array when paginate is 0', () => {
      const posts: Document[] = [];
      const config: JekyllConfig = { paginate: 0 };
      
      const result = generatePagination(posts, config);
      
      expect(result).toEqual([]);
    });

    it('should generate single page for posts within per_page limit', () => {
      // Create 5 mock posts
      const posts: Document[] = Array.from({ length: 5 }, (_, i) => createMockDocument(i));
      
      const config: JekyllConfig = { paginate: 10 };
      
      const result = generatePagination(posts, config);
      
      expect(result).toHaveLength(1);
      expect(result[0]!).toMatchObject({
        page: 1,
        per_page: 10,
        total_posts: 5,
        total_pages: 1,
        previous_page: null,
        next_page: null,
        previous_page_path: null,
        next_page_path: null,
      });
      expect(result[0]!.posts).toHaveLength(5);
    });

    it('should generate multiple pages for posts exceeding per_page limit', () => {
      // Create 25 mock posts
      const posts: Document[] = Array.from({ length: 25 }, (_, i) => createMockDocument(i));
      
      const config: JekyllConfig = { paginate: 10 };
      
      const result = generatePagination(posts, config);
      
      expect(result).toHaveLength(3); // 25 posts / 10 per page = 3 pages
      
      // Check first page
      expect(result[0]!).toMatchObject({
        page: 1,
        per_page: 10,
        total_posts: 25,
        total_pages: 3,
        previous_page: null,
        next_page: 2,
        previous_page_path: null,
        next_page_path: '/page2/',
      });
      expect(result[0]!.posts).toHaveLength(10);
      
      // Check middle page
      expect(result[1]!).toMatchObject({
        page: 2,
        per_page: 10,
        total_posts: 25,
        total_pages: 3,
        previous_page: 1,
        next_page: 3,
        previous_page_path: '/',
        next_page_path: '/page3/',
      });
      expect(result[1]!.posts).toHaveLength(10);
      
      // Check last page
      expect(result[2]!).toMatchObject({
        page: 3,
        per_page: 10,
        total_posts: 25,
        total_pages: 3,
        previous_page: 2,
        next_page: null,
        previous_page_path: '/page2/',
        next_page_path: null,
      });
      expect(result[2]!.posts).toHaveLength(5); // Last page has remaining 5 posts
    });

    it('should respect custom paginate_path pattern', () => {
      const posts: Document[] = Array.from({ length: 15 }, (_, i) => createMockDocument(i));
      
      const config: JekyllConfig = { 
        paginate: 10,
        paginate_path: '/blog/page:num/'
      };
      
      const result = generatePagination(posts, config);
      
      expect(result).toHaveLength(2);
      expect(result[0]!.previous_page_path).toBe(null);
      expect(result[0]!.next_page_path).toBe('/blog/page2/');
      expect(result[1]!.previous_page_path).toBe('/');
      expect(result[1]!.next_page_path).toBe(null);
    });

    it('should include baseurl in page paths', () => {
      const posts: Document[] = Array.from({ length: 15 }, (_, i) => createMockDocument(i));
      
      const config: JekyllConfig = { 
        paginate: 10,
        baseurl: '/blog'
      };
      
      const result = generatePagination(posts, config);
      
      expect(result).toHaveLength(2);
      expect(result[0]!.previous_page_path).toBe(null);
      expect(result[0]!.next_page_path).toBe('/blog/page2/');
      expect(result[1]!.previous_page_path).toBe('/blog/');
      expect(result[1]!.next_page_path).toBe(null);
    });

    it('should handle exact multiple of per_page', () => {
      const posts: Document[] = Array.from({ length: 20 }, (_, i) => createMockDocument(i));
      
      const config: JekyllConfig = { paginate: 10 };
      
      const result = generatePagination(posts, config);
      
      expect(result).toHaveLength(2);
      expect(result[0]!.posts).toHaveLength(10);
      expect(result[1]!.posts).toHaveLength(10);
    });

    it('should slice posts correctly across pages', () => {
      const posts: Document[] = Array.from({ length: 25 }, (_, i) => createMockDocument(i));
      
      const config: JekyllConfig = { paginate: 10 };
      
      const result = generatePagination(posts, config);
      
      // Check that posts are distributed correctly
      expect((result[0]!.posts[0] as any).index).toBe(0);
      expect((result[0]!.posts[9] as any).index).toBe(9);
      expect((result[1]!.posts[0] as any).index).toBe(10);
      expect((result[1]!.posts[9] as any).index).toBe(19);
      expect((result[2]!.posts[0] as any).index).toBe(20);
      expect((result[2]!.posts[4] as any).index).toBe(24);
    });
  });

  describe('getPaginatedFilePath', () => {
    it('should return index.html for first page', () => {
      const result = getPaginatedFilePath(1, '/page:num/');
      expect(result).toBe('index.html');
    });

    it('should return correct path for subsequent pages', () => {
      const result = getPaginatedFilePath(2, '/page:num/');
      expect(result).toBe('page2/index.html');
    });

    it('should handle custom pagination paths', () => {
      const result = getPaginatedFilePath(2, '/blog/page:num/');
      expect(result).toBe('blog/page2/index.html');
    });

    it('should handle path without trailing slash', () => {
      const result = getPaginatedFilePath(2, '/page:num');
      expect(result).toBe('page2/index.html');
    });

    it('should handle path without leading slash', () => {
      const result = getPaginatedFilePath(2, 'page:num/');
      expect(result).toBe('page2/index.html');
    });

    it('should handle complex pagination paths', () => {
      const result = getPaginatedFilePath(3, '/posts/archive/page:num/');
      expect(result).toBe('posts/archive/page3/index.html');
    });

    it('should return index.html for first page even with custom path', () => {
      const result = getPaginatedFilePath(1, '/blog/page:num/');
      expect(result).toBe('index.html');
    });
  });
});
