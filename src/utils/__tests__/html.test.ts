import { escapeHtml, unescapeHtml, escapeJs, escapeXml, safeJsonStringify } from '../html';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('Hello <script>alert("XSS")</script>')).toBe(
      'Hello &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('He said "Hello"')).toBe('He said &quot;Hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("It's a test")).toBe('It&#39;s a test');
  });

  it('should escape less than and greater than', () => {
    expect(escapeHtml('1 < 2 > 0')).toBe('1 &lt; 2 &gt; 0');
  });

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle string with no special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('should escape all special characters together', () => {
    expect(escapeHtml('<div class="test" data-name=\'value\'>&nbsp;</div>')).toBe(
      '&lt;div class=&quot;test&quot; data-name=&#39;value&#39;&gt;&amp;nbsp;&lt;/div&gt;'
    );
  });

  it('should handle numbers converted to string', () => {
    // The function converts non-string inputs to strings
    expect(escapeHtml(123 as unknown as string)).toBe('123');
  });
});

describe('unescapeHtml', () => {
  it('should unescape HTML entities', () => {
    expect(unescapeHtml('&lt;div&gt;&amp;nbsp;&lt;/div&gt;')).toBe('<div>&nbsp;</div>');
  });

  it('should unescape all standard entities', () => {
    expect(unescapeHtml('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'');
  });

  it('should handle numeric character references', () => {
    expect(unescapeHtml('&#38;&#60;&#62;&#34;&#39;')).toBe('&<>"\'');
  });

  it('should handle empty string', () => {
    expect(unescapeHtml('')).toBe('');
  });

  it('should be the inverse of escapeHtml', () => {
    const original = '<p class="test">Hello & "World" \'s</p>';
    const escaped = escapeHtml(original);
    const unescaped = unescapeHtml(escaped);
    expect(unescaped).toBe(original);
  });
});

describe('escapeJs', () => {
  it('should escape backslashes', () => {
    expect(escapeJs('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape double quotes', () => {
    expect(escapeJs('say "hello"')).toBe('say \\"hello\\"');
  });

  it('should escape single quotes', () => {
    expect(escapeJs("it's")).toBe("it\\'s");
  });

  it('should escape angle brackets', () => {
    expect(escapeJs('<script>')).toBe('\\x3cscript\\x3e');
  });

  it('should escape newlines', () => {
    expect(escapeJs('line1\nline2')).toBe('line1\\nline2');
  });

  it('should escape carriage returns', () => {
    expect(escapeJs('line1\rline2')).toBe('line1\\rline2');
  });

  it('should escape tabs', () => {
    expect(escapeJs('col1\tcol2')).toBe('col1\\tcol2');
  });

  it('should escape form feeds', () => {
    expect(escapeJs('page1\fpage2')).toBe('page1\\fpage2');
  });

  it('should handle empty string', () => {
    expect(escapeJs('')).toBe('');
  });

  it('should handle complex JavaScript strings', () => {
    expect(escapeJs('<script>alert("XSS")</script>')).toBe(
      '\\x3cscript\\x3ealert(\\"XSS\\")\\x3c/script\\x3e'
    );
  });
});

describe('escapeXml', () => {
  it('should escape ampersand', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less than', () => {
    expect(escapeXml('1 < 2')).toBe('1 &lt; 2');
  });

  it('should escape greater than', () => {
    expect(escapeXml('2 > 1')).toBe('2 &gt; 1');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('should escape single quotes (apostrophe)', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('should escape all XML special characters', () => {
    expect(escapeXml('<text attr="value">Tom & Jerry\'s</text>')).toBe(
      '&lt;text attr=&quot;value&quot;&gt;Tom &amp; Jerry&apos;s&lt;/text&gt;'
    );
  });

  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should handle string with no special characters', () => {
    expect(escapeXml('Hello World')).toBe('Hello World');
  });

  it('should convert non-string inputs to string', () => {
    expect(escapeXml(123 as unknown as string)).toBe('123');
  });
});

describe('safeJsonStringify', () => {
  it('should stringify basic objects', () => {
    expect(safeJsonStringify({ name: 'test', value: 123 })).toBe('{"name":"test","value":123}');
  });

  it('should escape closing script tags to prevent XSS', () => {
    const result = safeJsonStringify({ title: '</script><script>alert(1)</script>' });
    // The < and > should be escaped as Unicode
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003c/script\\u003e');
    expect(result).toContain('\\u003cscript\\u003e');
  });

  it('should escape all angle brackets', () => {
    const result = safeJsonStringify({ html: '<div>test</div>' });
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('\\u003c');
    expect(result).toContain('\\u003e');
  });

  it('should escape HTML comment sequences', () => {
    const result = safeJsonStringify({ comment: '<!-- hidden -->' });
    expect(result).not.toContain('<!--');
    expect(result).toContain('\\u003c!--');
  });

  it('should escape Line Separator (U+2028)', () => {
    const result = safeJsonStringify({ text: 'line1\u2028line2' });
    expect(result).toContain('\\u2028');
    expect(result).not.toContain('\u2028');
  });

  it('should escape Paragraph Separator (U+2029)', () => {
    const result = safeJsonStringify({ text: 'para1\u2029para2' });
    expect(result).toContain('\\u2029');
    expect(result).not.toContain('\u2029');
  });

  it('should handle null input', () => {
    expect(safeJsonStringify(null)).toBe('null');
  });

  it('should handle undefined input', () => {
    expect(safeJsonStringify(undefined)).toBe('null');
  });

  it('should handle arrays', () => {
    const result = safeJsonStringify(['<test>', '</test>']);
    expect(result).toBe('["\\u003ctest\\u003e","\\u003c/test\\u003e"]');
  });

  it('should handle nested objects with dangerous content', () => {
    const result = safeJsonStringify({
      outer: {
        inner: '</script><script>evil()</script>',
      },
    });
    expect(result).not.toContain('</script>');
  });

  it('should support indentation parameter (number)', () => {
    const result = safeJsonStringify({ a: 1 }, 2);
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });

  it('should support indentation parameter (string)', () => {
    const result = safeJsonStringify({ a: 1 }, '\t');
    expect(result).toContain('\n');
    expect(result).toContain('\t');
  });

  it('should produce valid JSON when parsed back', () => {
    const original = {
      title: '</script><script>alert("XSS")</script>',
      nested: { value: '<!-- comment -->' },
    };
    const json = safeJsonStringify(original);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(original);
  });

  it('should handle real-world XSS payload in page title', () => {
    const payload = {
      '@type': 'BlogPosting',
      headline: '</script><img src=x onerror=alert(1)>',
      description: 'A normal description',
    };
    const result = safeJsonStringify(payload);
    // The output should be safe to embed in a <script> tag
    expect(result).not.toContain('</script>');
    expect(result).not.toContain('<img');
  });
});
