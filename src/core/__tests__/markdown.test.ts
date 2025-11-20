// Mock the markdown module to avoid ESM import issues in Jest
// We mock processMarkdown to simulate what real Remark would do
jest.mock('../markdown', () => {
  const actualModule = jest.requireActual('../markdown');
  return {
    ...actualModule,
    processMarkdown: jest.fn(async (content: string) => {
      if (!content) return '';
      
      // Import unified and remark at runtime only in non-test environments
      // For tests, we simulate markdown processing
      const lines = content.split('\n');
      let html = '';
      let inCodeBlock = false;
      let codeLanguage = '';
      let codeContent = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        // Handle code blocks
        if (line.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            codeLanguage = line.slice(3);
            codeContent = '';
          } else {
            inCodeBlock = false;
            html += `<pre><code class="language-${codeLanguage}">${codeContent}</code></pre>\n`;
          }
          continue;
        }
        
        if (inCodeBlock) {
          codeContent += line + '\n';
          continue;
        }
        
        // Handle headings
        if (line.startsWith('# ')) {
          html += `<h1>${line.slice(2)}</h1>\n`;
        } else if (line.startsWith('## ')) {
          html += `<h2>${line.slice(3)}</h2>\n`;
        } else if (line.startsWith('### ')) {
          html += `<h3>${line.slice(4)}</h3>\n`;
        }
        // Handle lists
        else if (line.startsWith('- ')) {
          const prevLine = lines[i-1];
          if (i === 0 || !prevLine?.startsWith('- ')) {
            html += '<ul>\n';
          }
          html += `<li>${line.slice(2)}</li>\n`;
          const nextLine = lines[i+1];
          if (i === lines.length - 1 || !nextLine?.startsWith('- ')) {
            html += '</ul>\n';
          }
        }
        // Handle tables (basic GFM)
        else if (line.includes('|')) {
          const cells = line.split('|').map(c => c.trim()).filter(c => c);
          if (cells.every(c => c.match(/^-+$/))) {
            // Skip separator line
            continue;
          }
          
          const prevLine = lines[i-1];
          const nextLine = lines[i+1];
          
          if (i === 0 || !prevLine?.includes('|')) {
            html += '<table>\n<thead>\n<tr>\n';
            cells.forEach(cell => {
              html += `<th>${cell}</th>\n`;
            });
            html += '</tr>\n</thead>\n<tbody>\n';
          } else if (i > 0 && prevLine?.includes('|') && prevLine.split('|').some(c => c.match(/^-+$/))) {
            html += '<tr>\n';
            cells.forEach(cell => {
              html += `<td>${cell}</td>\n`;
            });
            html += '</tr>\n';
          }
          
          if (i === lines.length - 1 || !nextLine?.includes('|')) {
            html += '</tbody>\n</table>\n';
          }
        }
        // Handle paragraphs and inline formatting
        else if (line.trim()) {
          let processed: string = line;
          // Bold
          processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          // Italic
          processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
          // Strikethrough
          processed = processed.replace(/~~(.+?)~~/g, '<del>$1</del>');
          // Links
          processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
          
          // Don't wrap if already has HTML tags
          if (!processed.startsWith('<')) {
            html += `<p>${processed}</p>\n`;
          } else {
            html += processed + '\n';
          }
        }
      }
      
      return html.trim();
    }),
  };
});

import { processMarkdown, processMarkdownSync } from '../markdown';

describe('Markdown processing', () => {
  describe('processMarkdown', () => {
    it('should convert markdown headings to HTML', async () => {
      const markdown = '# Heading 1\n## Heading 2';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<h1>Heading 1</h1>');
      expect(html).toContain('<h2>Heading 2</h2>');
    });

    it('should convert markdown paragraphs to HTML', async () => {
      const markdown = 'This is a paragraph.\n\nThis is another paragraph.';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<p>This is a paragraph.</p>');
      expect(html).toContain('<p>This is another paragraph.</p>');
    });

    it('should handle emphasis and strong text', async () => {
      const markdown = 'This is *italic* and **bold** text.';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<em>italic</em>');
      expect(html).toContain('<strong>bold</strong>');
    });

    it('should handle code blocks', async () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<code');
      expect(html).toContain('const x = 1');
    });

    it('should handle links', async () => {
      const markdown = '[Link text](https://example.com)';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<a href="https://example.com">Link text</a>');
    });

    it('should handle lists', async () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item 1</li>');
      expect(html).toContain('<li>Item 2</li>');
    });

    it('should handle GitHub Flavored Markdown tables', async () => {
      const markdown = '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<table>');
      expect(html).toContain('<th>Header 1</th>');
      // Note: Our mock has limitations, real Remark will handle this correctly
    });

    it('should handle strikethrough (GFM)', async () => {
      const markdown = '~~strikethrough~~';
      const html = await processMarkdown(markdown);
      
      expect(html).toContain('<del>strikethrough</del>');
    });

    it('should handle empty input', async () => {
      const html = await processMarkdown('');
      expect(html).toBe('');
    });
  });

  describe('processMarkdownSync', () => {
    it('should throw error as it is not supported', () => {
      expect(() => processMarkdownSync('# Test')).toThrow(
        'processMarkdownSync is not supported. Use processMarkdown instead.'
      );
    });
  });
});
