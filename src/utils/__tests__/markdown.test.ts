import { processTextWithMarkdown, processTextWithMarkdownToHtml } from '../markdown';

describe('processTextWithMarkdown', () => {
  it('should convert markdown to HTML and strip tags', async () => {
    const result = await processTextWithMarkdown('This is **bold** and *italic* text');
    expect(result).toBe('This is bold and italic text');
  });

  it('should handle markdown links', async () => {
    const result = await processTextWithMarkdown('Check out [this link](https://example.com)');
    expect(result).toBe('Check out this link');
  });

  it('should handle inline code', async () => {
    const result = await processTextWithMarkdown('Use `npm install` to install');
    expect(result).toBe('Use npm install to install');
  });

  it('should handle headings', async () => {
    const result = await processTextWithMarkdown('# Heading');
    expect(result).toBe('Heading');
  });

  it('should handle empty string', async () => {
    const result = await processTextWithMarkdown('');
    expect(result).toBe('');
  });

  it('should handle plain text without markdown', async () => {
    const result = await processTextWithMarkdown('Just plain text');
    expect(result).toBe('Just plain text');
  });

  it('should truncate to maxLength when specified', async () => {
    const result = await processTextWithMarkdown(
      'This is a very long text that should be truncated',
      {
        maxLength: 20,
      }
    );
    expect(result.length).toBeLessThanOrEqual(20);
    // Should truncate at word boundary (last space before char 20 is at position 18, which is > 16 (80% of 20))
    expect(result).toBe('This is a very long');
  });

  it('should not truncate if text is shorter than maxLength', async () => {
    const result = await processTextWithMarkdown('Short text', { maxLength: 100 });
    expect(result).toBe('Short text');
  });

  it('should handle markdown with maxLength', async () => {
    const result = await processTextWithMarkdown('This is **bold** and *italic* text', {
      maxLength: 15,
    });
    expect(result.length).toBeLessThanOrEqual(15);
    // Should truncate at word boundary (last space before char 15 is at position 12, which is > 12 (80% of 15))
    expect(result).toBe('This is bold');
  });

  it('should truncate at word boundaries for better readability', async () => {
    const result = await processTextWithMarkdown('The quick brown fox jumps over the lazy dog', {
      maxLength: 20,
    });
    expect(result.length).toBeLessThanOrEqual(20);
    // Should end at a word boundary, not mid-word
    expect(result).toBe('The quick brown fox');
    expect(result).not.toContain('ju'); // Should not cut "jumps" to "ju"
  });

  it('should handle edge case where word boundary would lose too much content', async () => {
    // If last space is before 80% of maxLength, use hard cutoff
    const result = await processTextWithMarkdown('Supercalifragilisticexpialidocious', {
      maxLength: 20,
    });
    expect(result.length).toBeLessThanOrEqual(20);
    // No spaces, so should use hard cutoff at exactly 20 chars
    expect(result).toBe('Supercalifragilistic');
  });

  it('should trim whitespace from result', async () => {
    const result = await processTextWithMarkdown('  Text with spaces  ');
    expect(result).toBe('Text with spaces');
  });

  it('should handle multiple paragraphs', async () => {
    const result = await processTextWithMarkdown('First paragraph\n\nSecond paragraph');
    expect(result).toContain('First paragraph');
    expect(result).toContain('Second paragraph');
  });

  it('should handle complex nested markdown', async () => {
    const result = await processTextWithMarkdown('**Bold with *italic* inside**');
    expect(result).toBe('Bold with italic inside');
  });
});

describe('processTextWithMarkdownToHtml', () => {
  it('should convert markdown to HTML and preserve tags', async () => {
    const result = await processTextWithMarkdownToHtml('This is **bold** and *italic* text');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('should handle markdown links as HTML', async () => {
    const result = await processTextWithMarkdownToHtml(
      'Check out [this link](https://example.com)'
    );
    expect(result).toContain('<a href="https://example.com">this link</a>');
  });

  it('should handle inline code as HTML', async () => {
    const result = await processTextWithMarkdownToHtml('Use `npm install` to install');
    expect(result).toContain('<code>npm install</code>');
  });

  it('should handle headings as HTML', async () => {
    const result = await processTextWithMarkdownToHtml('# Heading');
    expect(result).toContain('<h1>Heading</h1>');
  });

  it('should handle empty string', async () => {
    const result = await processTextWithMarkdownToHtml('');
    expect(result).toBe('');
  });

  it('should handle plain text', async () => {
    const result = await processTextWithMarkdownToHtml('Just plain text');
    expect(result).toContain('Just plain text');
  });

  it('should wrap text in paragraph tags', async () => {
    const result = await processTextWithMarkdownToHtml('Just plain text');
    expect(result).toContain('<p>');
    expect(result).toContain('</p>');
  });

  it('should handle multiple paragraphs as separate HTML elements', async () => {
    const result = await processTextWithMarkdownToHtml('First paragraph\n\nSecond paragraph');
    expect(result).toContain('<p>First paragraph</p>');
    expect(result).toContain('<p>Second paragraph</p>');
  });

  it('should handle lists as HTML', async () => {
    const result = await processTextWithMarkdownToHtml('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
  });

  it('should handle complex nested markdown as HTML', async () => {
    const result = await processTextWithMarkdownToHtml('**Bold with *italic* inside**');
    expect(result).toContain('<strong>Bold with <em>italic</em> inside</strong>');
  });
});
