import { applyFrontMatterDefaults, JekyllConfig } from '../Config';

describe('applyFrontMatterDefaults', () => {
  describe('basic functionality', () => {
    it('should return front matter unchanged when no defaults are configured', () => {
      const frontMatter = { title: 'Test', author: 'John' };
      const config: JekyllConfig = {};

      const result = applyFrontMatterDefaults('test.md', 'page', frontMatter, config);

      expect(result).toEqual(frontMatter);
    });

    it('should return front matter unchanged when defaults array is empty', () => {
      const frontMatter = { title: 'Test', author: 'John' };
      const config: JekyllConfig = { defaults: [] };

      const result = applyFrontMatterDefaults('test.md', 'page', frontMatter, config);

      expect(result).toEqual(frontMatter);
    });

    it('should apply defaults when scope matches all files', () => {
      const frontMatter = { title: 'Test' };
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: { layout: 'default', author: 'Jane Doe' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('test.md', 'page', frontMatter, config);

      expect(result).toEqual({
        layout: 'default',
        author: 'Jane Doe',
        title: 'Test',
      });
    });

    it('should allow file front matter to override defaults', () => {
      const frontMatter = { title: 'Test', layout: 'custom' };
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: { layout: 'default', author: 'Jane Doe' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('test.md', 'page', frontMatter, config);

      expect(result).toEqual({
        layout: 'custom', // File front matter wins
        author: 'Jane Doe',
        title: 'Test',
      });
    });
  });

  describe('type matching', () => {
    it('should match posts type', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'posts' },
            values: { layout: 'post' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        '_posts/2024-01-01-test.md',
        'post',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'post' });
    });

    it('should not match posts type for pages', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'posts' },
            values: { layout: 'post' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('about.md', 'page', frontMatter, config);

      expect(result).toEqual({});
    });

    it('should match pages type', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'pages' },
            values: { layout: 'page' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('about.md', 'page', frontMatter, config);

      expect(result).toEqual({ layout: 'page' });
    });

    it('should not match pages type for posts', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'pages' },
            values: { layout: 'page' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        '_posts/2024-01-01-test.md',
        'post',
        frontMatter,
        config
      );

      expect(result).toEqual({});
    });

    it('should match collection name as type', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'recipes' },
            values: { layout: 'recipe' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        '_recipes/chocolate-cake.md',
        'recipes',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'recipe' });
    });
  });

  describe('path matching', () => {
    it('should match specific directory', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects/my-project.md',
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'project' });
    });

    it('should match nested files in directory', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects/subdir/my-project.md',
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'project' });
    });

    it('should not match files outside the path', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('about.md', 'page', frontMatter, config);

      expect(result).toEqual({});
    });

    it('should support glob patterns', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '*.draft.md' },
            values: { published: false },
          },
        ],
      };

      const result = applyFrontMatterDefaults('test.draft.md', 'page', frontMatter, config);

      expect(result).toEqual({ published: false });
    });
  });

  describe('combined path and type matching', () => {
    it('should match both path and type', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects', type: 'pages' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects/my-project.md',
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'project' });
    });

    it('should not match when path matches but type does not', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '_posts', type: 'pages' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        '_posts/2024-01-01-test.md',
        'post',
        frontMatter,
        config
      );

      expect(result).toEqual({});
    });

    it('should not match when type matches but path does not', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects', type: 'pages' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('about.md', 'page', frontMatter, config);

      expect(result).toEqual({});
    });
  });

  describe('multiple scopes', () => {
    it('should apply defaults from multiple matching scopes in order', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: { layout: 'default', author: 'Jane Doe', category: 'general' },
          },
          {
            scope: { path: 'projects' },
            values: { layout: 'project', category: 'projects' }, // Overrides earlier defaults
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects/my-project.md',
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({
        layout: 'project', // Later scope overrides
        author: 'Jane Doe', // From first scope
        category: 'projects', // Later scope overrides
      });
    });

    it('should handle complex multi-scope scenario', () => {
      const frontMatter = { title: 'My Post' };
      const config: JekyllConfig = {
        defaults: [
          // Global defaults for all content
          {
            scope: { path: '' },
            values: { layout: 'default', author: 'Site Author' },
          },
          // Defaults for all posts
          {
            scope: { path: '', type: 'posts' },
            values: { layout: 'post', comments: true },
          },
          // Specific category of posts
          {
            scope: { path: '_posts/tech' },
            values: { category: 'technology', author: 'Tech Team' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        '_posts/tech/2024-01-01-my-post.md',
        'post',
        frontMatter,
        config
      );

      expect(result).toEqual({
        layout: 'post',
        author: 'Tech Team',
        comments: true,
        category: 'technology',
        title: 'My Post',
      });
    });

    it('should preserve file front matter precedence over all defaults', () => {
      const frontMatter = { layout: 'custom', author: 'File Author' };
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: { layout: 'default', author: 'Default Author', category: 'general' },
          },
          {
            scope: { path: 'projects' },
            values: { layout: 'project', author: 'Project Author' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects/my-project.md',
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({
        layout: 'custom', // File front matter wins
        author: 'File Author', // File front matter wins
        category: 'general', // From defaults
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle Jekyll documentation example', () => {
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'posts' },
            values: { layout: 'post', author: 'John Doe' },
          },
          {
            scope: { path: 'projects', type: 'pages' },
            values: { layout: 'project' },
          },
        ],
      };

      // Test post with no front matter
      const postResult = applyFrontMatterDefaults('_posts/2024-01-01-test.md', 'post', {}, config);
      expect(postResult).toEqual({ layout: 'post', author: 'John Doe' });

      // Test project page
      const projectResult = applyFrontMatterDefaults('projects/awesome-app.md', 'page', {}, config);
      expect(projectResult).toEqual({ layout: 'project' });

      // Test regular page
      const pageResult = applyFrontMatterDefaults('about.md', 'page', {}, config);
      expect(pageResult).toEqual({});
    });

    it('should handle collection-specific defaults', () => {
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '', type: 'recipes' },
            values: { layout: 'recipe', category: 'cooking' },
          },
          {
            scope: { path: '', type: 'authors' },
            values: { layout: 'author' },
          },
        ],
      };

      const recipeResult = applyFrontMatterDefaults(
        '_recipes/chocolate-cake.md',
        'recipes',
        { title: 'Chocolate Cake' },
        config
      );
      expect(recipeResult).toEqual({
        layout: 'recipe',
        category: 'cooking',
        title: 'Chocolate Cake',
      });

      const authorResult = applyFrontMatterDefaults(
        '_authors/john-doe.md',
        'authors',
        { name: 'John Doe' },
        config
      );
      expect(authorResult).toEqual({
        layout: 'author',
        name: 'John Doe',
      });
    });

    it('should handle empty front matter', () => {
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: { layout: 'default' },
          },
        ],
      };

      const result = applyFrontMatterDefaults('test.md', 'page', {}, config);
      expect(result).toEqual({ layout: 'default' });
    });
  });

  describe('edge cases', () => {
    it('should handle paths with backslashes (Windows)', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects\\my-project.md', // Windows-style path
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'project' });
    });

    it('should handle scope path with backslashes', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: 'projects\\subdir' },
            values: { layout: 'project' },
          },
        ],
      };

      const result = applyFrontMatterDefaults(
        'projects/subdir/my-project.md',
        'page',
        frontMatter,
        config
      );

      expect(result).toEqual({ layout: 'project' });
    });

    it('should handle nested default values', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: {
              layout: 'default',
              metadata: {
                author: 'Site Author',
                tags: ['general'],
              },
            },
          },
        ],
      };

      const result = applyFrontMatterDefaults('test.md', 'page', frontMatter, config);

      expect(result).toEqual({
        layout: 'default',
        metadata: {
          author: 'Site Author',
          tags: ['general'],
        },
      });
    });

    it('should handle array values in defaults', () => {
      const frontMatter = {};
      const config: JekyllConfig = {
        defaults: [
          {
            scope: { path: '' },
            values: {
              tags: ['default', 'general'],
              categories: ['blog'],
            },
          },
        ],
      };

      const result = applyFrontMatterDefaults('test.md', 'page', frontMatter, config);

      expect(result).toEqual({
        tags: ['default', 'general'],
        categories: ['blog'],
      });
    });
  });
});
