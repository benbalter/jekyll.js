# Performance Improvements: Identification and Suggestions

This document identifies areas of slow or inefficient code in Jekyll.ts and suggests improvements. Each suggestion is categorized by impact, complexity, and priority.

## Implemented Improvements ✅

The following optimizations have been implemented:

### 1. Pre-compiled Regex Patterns in Kramdown Processing

**Location**: `src/core/markdown.ts`

**Change**: Moved regex pattern compilation from inside `processKramdownAttributes()` to module scope. Patterns (`KRAMDOWN_BLOCK_PATTERN`, `KRAMDOWN_INLINE_PATTERN`, `KRAMDOWN_STANDALONE_PATTERN`) are now compiled once at module load time instead of on every function call.

**Before**:
```typescript
function processKramdownAttributes(html: string): string {
  // Compiled fresh on EVERY call!
  const blockPattern = new RegExp(`...`, 'gi');
  const inlinePattern = new RegExp(`...`, 'gi');
  // ...
}
```

**After**:
```typescript
// Compiled once at module load
const KRAMDOWN_BLOCK_PATTERN = new RegExp(`...`, 'gi');
const KRAMDOWN_INLINE_PATTERN = new RegExp(`...`, 'gi');
const KRAMDOWN_STANDALONE_PATTERN = /...pattern.../gi;

function processKramdownAttributes(html: string): string {
  // Reuses pre-compiled patterns
  html = html.replace(KRAMDOWN_BLOCK_PATTERN, ...);
  // ...
}
```

**Impact**: Eliminates regex compilation overhead on every markdown document processed.

---

### 2. Document JSON Caching

**Location**: `src/core/Document.ts`

**Change**: Added `_jsonCache` field and updated `toJSON()` to cache its result. The cache is automatically invalidated when the `url` property is set.

**Implementation**:
```typescript
export class Document {
  private _jsonCache: Record<string, any> | null = null;
  private _url?: string;

  get url(): string | undefined {
    return this._url;
  }

  set url(value: string | undefined) {
    this._url = value;
    this._jsonCache = null;  // Invalidate cache
  }

  toJSON(): Record<string, any> {
    if (this._jsonCache) {
      return this._jsonCache;
    }
    this._jsonCache = { /* ... fields ... */ };
    return this._jsonCache;
  }
}
```

**Impact**: Reduces object creation and GC pressure when site data is serialized multiple times (common during template rendering).

---

### 3. StaticFile JSON Caching

**Location**: `src/core/StaticFile.ts`

**Change**: Added `_jsonCache` field and updated `toJSON()` to cache its result.

**Impact**: Reduces object creation for static file metadata serialization.

---

## Additional Opportunities (Not Yet Implemented)

The following areas have been identified as potential improvement opportunities for very large sites:

| Category | Issue | Impact | Complexity | Priority |
|----------|-------|--------|------------|----------|
| I/O Operations | Synchronous file operations in Document/StaticFile | High | Medium | Medium |
| Data Structures | Pre-computed sort keys for large arrays | Low | Low | Low |
| Theme Manager | Cached directory existence checks | Low | Low | Low |
| Worker Threads | Parallel CPU-bound processing | Medium | High | Low |

---

### Synchronous File Operations in Document and StaticFile Constructors

**Location**:
- `src/core/Document.ts:83-133`
- `src/core/StaticFile.ts:52-61`

**Current Behavior**:
Both `Document` and `StaticFile` classes use synchronous file operations (`statSync`, `readFileSync`) in their constructors. Even though these are wrapped in async patterns in `Site.ts`, the actual I/O is still blocking:

```typescript
// Document.ts
constructor(...) {
  const stats = statSync(path);       // Blocking!
  const fileContent = readFileSync(path, encoding);  // Blocking!
}
```

**Impact**:
- **High**: On sites with 500+ files, synchronous I/O blocks the event loop
- Even with `Promise.all`, files are read sequentially on the main thread

**Suggested Improvement**:
Refactor to use async factory methods:

```typescript
export class Document {
  private constructor(/* ... */) { /* Set fields directly */ }

  static async create(
    path: string,
    sourcePath: string,
    type: DocumentType,
    collection?: string,
    config?: JekyllConfig
  ): Promise<Document> {
    const [stats, fileContent] = await Promise.all([
      stat(path),  // from fs/promises
      readFile(path, encoding)  // from fs/promises
    ]);
    // ... parse front matter
    return new Document(/* ... */);
  }
}
```

**Migration Path**:
1. Add `Document.create()` static async factory method
2. Deprecate constructor with JSDoc comment
3. Update Site.ts to use factory method
4. Update tests to use factory method

---

### hasFrontMatter Check Optimization

**Location**: `src/core/Site.ts:678-719`

**Current Behavior**:
The `hasFrontMatter` method opens, reads, and closes files individually using synchronous operations.

**Suggested Improvement**:
Batch check for front matter using async operations for large sites.

---

### ThemeManager Directory Existence Caching

**Location**: `src/core/ThemeManager.ts`

**Current Behavior**:
Many methods check `existsSync` multiple times for the same directories.

**Suggested Improvement**:
Cache existence checks at construction time for directories that don't change during a build.

---

### Worker Threads for CPU-Intensive Operations (Long-term)

**Location**:
- `src/core/markdown.ts` (processMarkdown)
- `src/core/SassProcessor.ts` (SASS compilation)

**Current Behavior**:
Markdown processing and SASS compilation run on the main thread.

**Impact**:
- **Medium**: These are CPU-bound operations
- Can block the event loop during large builds

**Note**: This is a significant architectural change and should only be considered for very large sites (1000+ documents) where the overhead of worker thread communication is justified.

---

## Benchmarking Notes

Before implementing any changes, establish baselines using the existing benchmark infrastructure:

```bash
# Run benchmark suite
npm run benchmark

# For detailed timing analysis
npm test -- --testPathPatterns=benchmark.test.ts
```

After each change:
1. Run benchmarks to measure impact
2. Test with both small (2 posts) and large (52+ posts) fixtures
3. Document results in PR description

---

## Related Documentation

- See `docs/PERFORMANCE.md` for scaling analysis
- See `src/cli/commands/__tests__/benchmark.test.ts` for benchmark test code
- See `src/utils/timer.ts` for timing instrumentation
