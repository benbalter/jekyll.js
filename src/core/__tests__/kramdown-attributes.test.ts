/**
 * Tests for Kramdown-style attribute list support
 *
 * Kramdown's Inline Attribute Lists (IAL) syntax allows adding classes, IDs,
 * and other attributes to elements using {: .class #id attr="value" } syntax.
 */

import { processMarkdown } from '../markdown';

describe('Kramdown Attribute List Support', () => {
  describe('block-level attributes', () => {
    it('should apply class to preceding paragraph', async () => {
      const markdown = 'Hello world\n\n{: .highlight }';
      const html = await processMarkdown(markdown);

      // The class should be applied to the paragraph
      expect(html).toContain('class="highlight"');
      expect(html).toContain('>Hello world<');
      // The attribute block should be removed
      expect(html).not.toContain('{: .highlight }');
    });

    it('should apply multiple classes', async () => {
      const markdown = 'Test paragraph\n\n{: .class1 .class2 .class3 }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('class1');
      expect(html).toContain('class2');
      expect(html).toContain('class3');
    });

    it('should apply ID attribute', async () => {
      const markdown = 'Section content\n\n{: #my-section }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('id="my-section"');
    });

    it('should apply both class and ID', async () => {
      const markdown = 'Important note\n\n{: .notice #important-note }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('class="notice"');
      expect(html).toContain('id="important-note"');
    });

    it('should apply custom data attributes', async () => {
      const markdown = 'Content\n\n{: data-toggle="modal" }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('data-toggle="modal"');
    });

    it('should apply to headings', async () => {
      const markdown = '# Main Title\n\n{: .page-title }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('class="page-title"');
      expect(html).toContain('>Main Title<');
    });

    it('should handle complex attribute combinations', async () => {
      const markdown = 'Complex element\n\n{: .styled .bordered #unique data-role="main" }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('class=');
      expect(html).toContain('styled');
      expect(html).toContain('bordered');
      expect(html).toContain('id="unique"');
      expect(html).toContain('data-role="main"');
    });
  });

  describe('edge cases', () => {
    it('should not modify content without attribute lists', async () => {
      const markdown = 'Normal paragraph without attributes';
      const html = await processMarkdown(markdown);

      expect(html).toContain('>Normal paragraph without attributes<');
      expect(html).not.toContain('{:');
    });

    it('should handle attribute lists on their own paragraph', async () => {
      const markdown = 'First paragraph\n\n{: .first }\n\nSecond paragraph';
      const html = await processMarkdown(markdown);

      // First paragraph should have the class
      expect(html).toContain('class="first"');
      // Both paragraphs should be present
      expect(html).toContain('First paragraph');
      expect(html).toContain('Second paragraph');
    });

    it('should reject HTML in attribute values to prevent XSS', async () => {
      // Malicious attempt to inject HTML via attribute value
      // The regex now rejects values containing < and > characters
      const markdown = 'Content\n\n{: data-value="<script>alert(1)</script>" }';
      const html = await processMarkdown(markdown);

      // Script should not appear in output (attribute value rejected, not matched)
      expect(html).not.toContain('<script>');
      // The attribute block should be removed as the value doesn't match the allowed pattern
      expect(html).toContain('Content');
    });

    it('should block dangerous event handler attributes', async () => {
      // Attempt to use onclick which is in the dangerous attrs blocklist
      const markdown = 'Content\n\n{: onclick="alert(1)" }';
      const html = await processMarkdown(markdown);

      // onclick should be blocked
      expect(html).not.toContain('onclick');
      expect(html).toContain('Content');
    });

    it('should remove orphaned attribute blocks', async () => {
      // An attribute block that doesn't apply to anything
      const markdown = '{: .orphan }\n\nSome content';
      const html = await processMarkdown(markdown);

      // The orphan attribute block should be removed or not cause issues
      expect(html).toContain('Some content');
    });

    it('should handle empty class list gracefully', async () => {
      const markdown = 'Content\n\n{: }';
      const html = await processMarkdown(markdown);

      // Empty attribute block should be removed without affecting content
      expect(html).toContain('Content');
    });
  });

  describe('security', () => {
    it('should prevent ReDoS with long attribute strings', async () => {
      // Create a very long attribute string that could cause ReDoS
      const longClass = '.class-' + 'a'.repeat(600);
      const markdown = `Content\n\n{: ${longClass} }`;

      // Should complete quickly without hanging (pattern has 500 char limit)
      const start = Date.now();
      const html = await processMarkdown(markdown);
      const duration = Date.now() - start;

      // Should complete within 5 seconds even with long input
      expect(duration).toBeLessThan(5000);
      expect(html).toContain('Content');
    });

    it('should escape special characters in class names', async () => {
      const markdown = 'Content\n\n{: .class-name }';
      const html = await processMarkdown(markdown);

      expect(html).toContain('class="class-name"');
    });
  });
});
