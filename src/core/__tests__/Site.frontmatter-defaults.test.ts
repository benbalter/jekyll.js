import { Site } from '../Site';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { JekyllConfig } from '../../config';

describe('Site with front matter defaults', () => {
  const testDir = join(__dirname, '../../../../tmp/test-site-frontmatter-defaults');

  beforeEach(() => {
    // Clean up and create fresh test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (rmSync) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should apply defaults to all pages in the site', () => {
    // Create test site structure
    writeFileSync(
      join(testDir, 'index.md'),
      `---
title: Home
---
Welcome`
    );

    writeFileSync(
      join(testDir, 'about.md'),
      `---
title: About
---
About us`
    );

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '', type: 'pages' },
          values: { layout: 'page', author: 'Site Admin' },
        },
      ],
    };

    const site = new Site(testDir, config);
    site.read();

    expect(site.pages.length).toBe(2);
    expect(site.pages[0]!.data.layout).toBe('page');
    expect(site.pages[0]!.data.author).toBe('Site Admin');
    expect(site.pages[1]!.data.layout).toBe('page');
    expect(site.pages[1]!.data.author).toBe('Site Admin');
  });

  it('should apply defaults to all posts in the site', () => {
    const postsDir = join(testDir, '_posts');
    mkdirSync(postsDir);

    writeFileSync(
      join(postsDir, '2024-01-01-first-post.md'),
      `---
title: First Post
---
Content`
    );

    writeFileSync(
      join(postsDir, '2024-01-02-second-post.md'),
      `---
title: Second Post
layout: custom
---
Content`
    );

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '', type: 'posts' },
          values: { layout: 'post', comments: true },
        },
      ],
    };

    const site = new Site(testDir, config);
    site.read();

    expect(site.posts.length).toBe(2);
    
    // First post should have default layout
    const firstPost = site.posts.find((p) => p.data.title === 'First Post');
    expect(firstPost?.data.layout).toBe('post');
    expect(firstPost?.data.comments).toBe(true);

    // Second post should override layout but keep comments
    const secondPost = site.posts.find((p) => p.data.title === 'Second Post');
    expect(secondPost?.data.layout).toBe('custom');
    expect(secondPost?.data.comments).toBe(true);
  });

  it('should apply defaults to collections', () => {
    const recipesDir = join(testDir, '_recipes');
    mkdirSync(recipesDir);

    writeFileSync(
      join(recipesDir, 'chocolate-cake.md'),
      `---
title: Chocolate Cake
---
Recipe content`
    );

    writeFileSync(
      join(recipesDir, 'apple-pie.md'),
      `---
title: Apple Pie
difficulty: hard
---
Recipe content`
    );

    const config: JekyllConfig = {
      collections: {
        recipes: {
          output: true,
        },
      },
      defaults: [
        {
          scope: { path: '', type: 'recipes' },
          values: { layout: 'recipe', difficulty: 'medium', category: 'desserts' },
        },
      ],
    };

    const site = new Site(testDir, config);
    site.read();

    const recipes = site.collections.get('recipes');
    expect(recipes?.length).toBe(2);

    const cakeRecipe = recipes?.find((r) => r.data.title === 'Chocolate Cake');
    expect(cakeRecipe?.data.layout).toBe('recipe');
    expect(cakeRecipe?.data.difficulty).toBe('medium');
    expect(cakeRecipe?.data.category).toBe('desserts');

    const pieRecipe = recipes?.find((r) => r.data.title === 'Apple Pie');
    expect(pieRecipe?.data.layout).toBe('recipe');
    expect(pieRecipe?.data.difficulty).toBe('hard'); // File overrides default
    expect(pieRecipe?.data.category).toBe('desserts');
  });

  it('should apply path-specific defaults', () => {
    const projectsDir = join(testDir, 'projects');
    mkdirSync(projectsDir);

    writeFileSync(
      join(testDir, 'index.md'),
      `---
title: Home
---
Welcome`
    );

    writeFileSync(
      join(projectsDir, 'project-a.md'),
      `---
title: Project A
---
Content`
    );

    writeFileSync(
      join(projectsDir, 'project-b.md'),
      `---
title: Project B
---
Content`
    );

    const config: JekyllConfig = {
      defaults: [
        {
          scope: { path: '' },
          values: { layout: 'default' },
        },
        {
          scope: { path: 'projects' },
          values: { layout: 'project', featured: true },
        },
      ],
    };

    const site = new Site(testDir, config);
    site.read();

    // Home page should have default layout
    const homePage = site.pages.find((p) => p.basename === 'index');
    expect(homePage?.data.layout).toBe('default');
    expect(homePage?.data.featured).toBeUndefined();

    // Project pages should have project layout
    const projectA = site.pages.find((p) => p.data.title === 'Project A');
    expect(projectA?.data.layout).toBe('project');
    expect(projectA?.data.featured).toBe(true);

    const projectB = site.pages.find((p) => p.data.title === 'Project B');
    expect(projectB?.data.layout).toBe('project');
    expect(projectB?.data.featured).toBe(true);
  });

  it('should handle complex multi-scope defaults', () => {
    const postsDir = join(testDir, '_posts');
    mkdirSync(postsDir);
    const techPostsDir = join(postsDir, 'tech');
    mkdirSync(techPostsDir);

    writeFileSync(
      join(postsDir, '2024-01-01-general-post.md'),
      `---
title: General Post
---
Content`
    );

    writeFileSync(
      join(techPostsDir, '2024-01-02-tech-post.md'),
      `---
title: Tech Post
---
Content`
    );

    const config: JekyllConfig = {
      defaults: [
        // Global defaults
        {
          scope: { path: '' },
          values: { layout: 'default', author: 'Site Author' },
        },
        // All posts
        {
          scope: { path: '', type: 'posts' },
          values: { layout: 'post', comments: true },
        },
        // Tech posts
        {
          scope: { path: '_posts/tech' },
          values: { category: 'technology', author: 'Tech Team' },
        },
      ],
    };

    const site = new Site(testDir, config);
    site.read();

    expect(site.posts.length).toBe(2);

    // General post
    const generalPost = site.posts.find((p) => p.data.title === 'General Post');
    expect(generalPost?.data.layout).toBe('post');
    expect(generalPost?.data.author).toBe('Site Author');
    expect(generalPost?.data.comments).toBe(true);
    expect(generalPost?.data.category).toBeUndefined();

    // Tech post
    const techPost = site.posts.find((p) => p.data.title === 'Tech Post');
    expect(techPost?.data.layout).toBe('post');
    expect(techPost?.data.author).toBe('Tech Team'); // More specific scope wins
    expect(techPost?.data.comments).toBe(true);
    expect(techPost?.data.category).toBe('technology');
  });

  it('should work with empty defaults array', () => {
    writeFileSync(
      join(testDir, 'index.md'),
      `---
title: Home
layout: custom
---
Welcome`
    );

    const config: JekyllConfig = {
      defaults: [],
    };

    const site = new Site(testDir, config);
    site.read();

    expect(site.pages.length).toBe(1);
    expect(site.pages[0]!.data.layout).toBe('custom');
  });

  it('should work without defaults configuration', () => {
    writeFileSync(
      join(testDir, 'index.md'),
      `---
title: Home
layout: custom
---
Welcome`
    );

    const config: JekyllConfig = {};

    const site = new Site(testDir, config);
    site.read();

    expect(site.pages.length).toBe(1);
    expect(site.pages[0]!.data.layout).toBe('custom');
  });

  it('should apply defaults across different document types', () => {
    const postsDir = join(testDir, '_posts');
    mkdirSync(postsDir);
    const recipesDir = join(testDir, '_recipes');
    mkdirSync(recipesDir);

    writeFileSync(
      join(testDir, 'index.md'),
      `---
title: Home
---
Welcome`
    );

    writeFileSync(
      join(postsDir, '2024-01-01-post.md'),
      `---
title: My Post
---
Content`
    );

    writeFileSync(
      join(recipesDir, 'recipe.md'),
      `---
title: My Recipe
---
Ingredients`
    );

    const config: JekyllConfig = {
      collections: {
        recipes: {
          output: true,
        },
      },
      defaults: [
        {
          scope: { path: '' },
          values: { author: 'Site Author' },
        },
        {
          scope: { path: '', type: 'pages' },
          values: { layout: 'page' },
        },
        {
          scope: { path: '', type: 'posts' },
          values: { layout: 'post', comments: true },
        },
        {
          scope: { path: '', type: 'recipes' },
          values: { layout: 'recipe', difficulty: 'medium' },
        },
      ],
    };

    const site = new Site(testDir, config);
    site.read();

    // Page
    const page = site.pages.find((p) => p.basename === 'index');
    expect(page?.data.layout).toBe('page');
    expect(page?.data.author).toBe('Site Author');
    expect(page?.data.comments).toBeUndefined();

    // Post
    const post = site.posts[0];
    expect(post?.data.layout).toBe('post');
    expect(post?.data.author).toBe('Site Author');
    expect(post?.data.comments).toBe(true);
    expect(post?.data.difficulty).toBeUndefined();

    // Collection
    const recipe = site.collections.get('recipes')?.[0];
    expect(recipe?.data.layout).toBe('recipe');
    expect(recipe?.data.author).toBe('Site Author');
    expect(recipe?.data.difficulty).toBe('medium');
    expect(recipe?.data.comments).toBeUndefined();
  });
});
