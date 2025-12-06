/**
 * Integration tests for markdown processing with real Remark implementation
 * These tests verify the markdown="1" attribute support using the actual processor
 */

import { processMarkdown } from '../markdown';

describe('Markdown integration tests (real implementation)', () => {
  describe('markdown="1" attribute support', () => {
    it('should process markdown inside HTML blocks with markdown="1"', async () => {
      const content = `<div markdown="1">
# Heading
This is **bold** text.
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<h1>Heading</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).not.toContain('markdown="1"');
    });

    it('should not process markdown in HTML blocks without markdown="1"', async () => {
      const content = `<div>
# Not a heading
This is **not bold**.
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('# Not a heading');
      expect(html).toContain('**not bold**');
      expect(html).not.toContain('<h1>');
      expect(html).not.toContain('<strong>');
    });

    it('should preserve other attributes on tags with markdown="1"', async () => {
      const content = `<div markdown="1" class="content" id="main">
## Heading
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('class="content"');
      expect(html).toContain('id="main"');
      expect(html).toContain('<h2>Heading</h2>');
      expect(html).not.toContain('markdown="1"');
    });

    it('should handle multiple HTML blocks with markdown="1"', async () => {
      const content = `<div markdown="1">
# First
</div>

<section markdown="1">
## Second
</section>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<h1>First</h1>');
      expect(html).toContain('<h2>Second</h2>');
    });

    it('should handle markdown="1" with single quotes', async () => {
      const content = `<div markdown='1'>
# Heading
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<h1>Heading</h1>');
      expect(html).not.toContain("markdown='1'");
    });

    it('should handle lists inside markdown="1" blocks', async () => {
      const content = `<div markdown="1">
- Item 1
- Item 2
- Item 3
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
    });

    it('should handle code blocks inside markdown="1" blocks', async () => {
      const content = `<div markdown="1">
\`\`\`javascript
const x = 1;
\`\`\`
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<code');
      expect(html).toContain('const x = 1');
    });

    it('should handle empty markdown="1" blocks', async () => {
      const content = `<div markdown="1">
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<div>');
      expect(html).toContain('</div>');
      expect(html).not.toContain('markdown="1"');
    });

    it('should handle mixed content with and without markdown="1"', async () => {
      const content = `Regular **markdown** text.

<div markdown="1">
# Processed heading
</div>

<div>
# Not processed
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<strong>markdown</strong>');
      expect(html).toContain('<h1>Processed heading</h1>');
      expect(html).toContain('# Not processed');
    });

    it('should handle nested HTML inside markdown="1" blocks', async () => {
      const content = `<div markdown="1">
# Heading

<span>This is regular HTML</span>

More **markdown** text.
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<h1>Heading</h1>');
      expect(html).toContain('<span>This is regular HTML</span>');
      expect(html).toContain('<strong>markdown</strong>');
    });

    it('should handle attributes with various formats', async () => {
      const content = `<div class="foo" markdown="1" data-test="value">
**Bold text**
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('class="foo"');
      expect(html).toContain('data-test="value"');
      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).not.toContain('markdown="1"');
    });

    it('should handle self-closing like elements gracefully', async () => {
      const content = `<div markdown="1">
Before

After
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<p>Before</p>');
      expect(html).toContain('<p>After</p>');
    });

    it('should handle nested tags of the same type correctly', async () => {
      const content = `<div markdown="1">
# Outer heading

<div>Inner non-markdown content</div>

**Bold text**
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<h1>Outer heading</h1>');
      expect(html).toContain('<div>Inner non-markdown content</div>');
      expect(html).toContain('<strong>Bold text</strong>');
    });

    it('should handle boolean attributes correctly', async () => {
      const content = `<div markdown="1" disabled data-active>
**Bold text**
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('disabled');
      expect(html).toContain('data-active');
      expect(html).not.toContain('markdown="1"');
    });

    it('should handle multiple attributes with proper spacing', async () => {
      const content = `<div class="foo" markdown="1" id="bar" data-test="value">
**Text**
</div>`;
      const html = await processMarkdown(content);

      expect(html).toContain('class="foo"');
      expect(html).toContain('id="bar"');
      expect(html).toContain('data-test="value"');
      // Verify proper spacing between attributes
      expect(html).toMatch(/class="foo"\s+id="bar"/);
    });
  });
});
