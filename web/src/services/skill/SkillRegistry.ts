/**
 * SkillRegistry — 50+ skill templates registry
 *
 * Inspired by: nanobot-design Skill system
 * Source pattern: /home/hermes/projects/nanobot-design/SPEC.md (agent/skills.py)
 *
 * A Skill is a reusable workflow template with input/output schemas and an
 * execution path. The registry indexes Skills by tags, category, and input
 * shape so the SubAgentSpawner (Direction B2) can find the right Skill for a
 * given task.
 *
 * Pure data + lookup, no I/O.
 */

export type SkillCategory =
  | 'content'
  | 'analysis'
  | 'transform'
  | 'search'
  | 'notification'
  | 'workflow'
  | 'memory'
  | 'integration';

export interface SkillInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface SkillOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
}

export interface Skill {
  name: string;
  version: string;
  category: SkillCategory;
  description: string;
  tags: string[];
  inputs: SkillInput[];
  outputs: SkillOutput[];
  /** List of other skills this depends on (by name) */
  dependencies: string[];
  /** Estimated cost in USD */
  estimatedCostUSD: number;
  /** Estimated execution time in ms */
  estimatedDurationMs: number;
  /** Number of times invoked (for popularity sorting) */
  invocationCount: number;
  /** ISO date this skill was registered */
  registeredAt: string;
}

export interface SkillSearchCriteria {
  category?: SkillCategory;
  tags?: string[];
  namePattern?: string; // substring match
  maxCostUSD?: number;
  maxDurationMs?: number;
  requiredInputs?: string[]; // input names that must be present
}

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<SkillCategory, Set<string>> = new Map();

  /** Register a skill. Throws if name+version already exists. */
  register(skill: Skill): void {
    this.validateSkill(skill);
    const key = this.keyOf(skill.name, skill.version);
    if (this.skills.has(key)) {
      throw new Error(`Skill "${skill.name}@${skill.version}" already registered`);
    }
    this.skills.set(key, { ...skill });
    this.indexSkill(skill);
  }

  /** Register multiple skills. */
  registerAll(skills: Skill[]): void {
    for (const s of skills) this.register(s);
  }

  /** Get a specific skill by name (latest version). */
  get(name: string): Skill | undefined {
    const versions = this.getVersions(name);
    if (versions.length === 0) return undefined;
    // Latest = highest version string
    versions.sort((a, b) => this.compareVersions(b, a));
    return this.skills.get(this.keyOf(name, versions[0]));
  }

  /** Get a specific version. */
  getVersion(name: string, version: string): Skill | undefined {
    const s = this.skills.get(this.keyOf(name, version));
    return s ? { ...s } : undefined;
  }

  /** List all versions of a skill (sorted descending by semver). */
  getVersions(name: string): string[] {
    const out: string[] = [];
    for (const k of this.skills.keys()) {
      const [n, v] = k.split('@');
      if (n === name) out.push(v);
    }
    out.sort((a, b) => this.compareVersions(b, a));
    return out;
  }

  /** Find skills matching criteria. */
  find(criteria: SkillSearchCriteria): Skill[] {
    let candidates: Skill[];

    if (criteria.category) {
      const ids = this.categoryIndex.get(criteria.category);
      candidates = ids
        ? Array.from(ids).map((k) => this.skills.get(k)!).filter(Boolean)
        : [];
    } else {
      candidates = Array.from(this.skills.values());
    }

    if (criteria.tags && criteria.tags.length > 0) {
      candidates = candidates.filter((s) =>
        criteria.tags!.every((t) => s.tags.includes(t)),
      );
    }

    if (criteria.namePattern) {
      const p = criteria.namePattern.toLowerCase();
      candidates = candidates.filter((s) => s.name.toLowerCase().includes(p));
    }

    if (criteria.maxCostUSD !== undefined) {
      const m = criteria.maxCostUSD;
      candidates = candidates.filter((s) => s.estimatedCostUSD <= m);
    }

    if (criteria.maxDurationMs !== undefined) {
      const m = criteria.maxDurationMs;
      candidates = candidates.filter((s) => s.estimatedDurationMs <= m);
    }

    if (criteria.requiredInputs && criteria.requiredInputs.length > 0) {
      candidates = candidates.filter((s) =>
        criteria.requiredInputs!.every((inp) => s.inputs.some((i) => i.name === inp)),
      );
    }

    return candidates.map((s) => ({ ...s }));
  }

  /** Find by exact tag. */
  findByTag(tag: string): Skill[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];
    return Array.from(ids).map((k) => this.skills.get(k)!).filter(Boolean).map((s) => ({ ...s }));
  }

  /** Increment invocation count (for popularity tracking). */
  recordInvocation(name: string): boolean {
    const s = this.get(name);
    if (!s) return false;
    const key = this.keyOf(s.name, s.version);
    const stored = this.skills.get(key)!;
    stored.invocationCount += 1;
    return true;
  }

  /** Get top N most-invoked skills. */
  topInvoked(limit: number = 10): Skill[] {
    return Array.from(this.skills.values())
      .sort((a, b) => b.invocationCount - a.invocationCount)
      .slice(0, limit)
      .map((s) => ({ ...s }));
  }

  /** Check if skill exists. */
  has(name: string): boolean {
    return this.getVersions(name).length > 0;
  }

  /** Remove a skill (and all its versions). */
  unregister(name: string): number {
    const versions = this.getVersions(name);
    for (const v of versions) {
      const key = this.keyOf(name, v);
      const skill = this.skills.get(key);
      if (skill) this.deindexSkill(skill);
      this.skills.delete(key);
    }
    return versions.length;
  }

  /** Total number of registered skills (counting all versions). */
  size(): number {
    return this.skills.size;
  }

  /** List all registered skill names (deduplicated, latest version only). */
  listNames(): string[] {
    const seen = new Set<string>();
    for (const s of this.skills.values()) {
      seen.add(s.name);
    }
    return Array.from(seen);
  }

  /** List all skills (latest version of each). */
  listAll(): Skill[] {
    const names = this.listNames();
    return names.map((n) => this.get(n)!).filter(Boolean);
  }

  /** Detect if all dependencies of a skill are present. */
  validateDependencies(name: string): { valid: boolean; missing: string[] } {
    const s = this.get(name);
    if (!s) return { valid: false, missing: [] };
    const missing: string[] = [];
    for (const dep of s.dependencies) {
      if (!this.has(dep)) missing.push(dep);
    }
    return { valid: missing.length === 0, missing };
  }

  /** Topological sort of skills by dependency. Returns names in execution order. */
  topologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const out: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Cyclic dependency detected at "${name}"`);
      }
      visiting.add(name);
      const s = this.get(name);
      if (s) {
        for (const dep of s.dependencies) visit(dep);
      }
      visiting.delete(name);
      visited.add(name);
      out.push(name);
    };

    for (const n of this.listNames()) visit(n);
    return out;
  }

  private indexSkill(s: Skill): void {
    const key = this.keyOf(s.name, s.version);
    for (const tag of s.tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
    if (!this.categoryIndex.has(s.category)) this.categoryIndex.set(s.category, new Set());
    this.categoryIndex.get(s.category)!.add(key);
  }

  private deindexSkill(s: Skill): void {
    const key = this.keyOf(s.name, s.version);
    for (const tag of s.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }
    this.categoryIndex.get(s.category)?.delete(key);
  }

  private validateSkill(s: Skill): void {
    if (!s.name || typeof s.name !== 'string') {
      throw new Error('Skill name must be non-empty string');
    }
    if (!s.version || typeof s.version !== 'string') {
      throw new Error(`Skill "${s.name}" version must be non-empty string`);
    }
    if (!Array.isArray(s.inputs)) throw new Error('Skill inputs must be array');
    if (!Array.isArray(s.outputs)) throw new Error('Skill outputs must be array');
    if (s.estimatedCostUSD < 0) throw new Error('estimatedCostUSD must be >= 0');
    if (s.estimatedDurationMs < 0) throw new Error('estimatedDurationMs must be >= 0');
    // Check input name uniqueness
    const inputNames = new Set<string>();
    for (const inp of s.inputs) {
      if (inputNames.has(inp.name)) {
        throw new Error(`Duplicate input name "${inp.name}" in skill "${s.name}"`);
      }
      inputNames.add(inp.name);
    }
  }

  private keyOf(name: string, version: string): string {
    return `${name}@${version}`;
  }

  private compareVersions(a: string, b: string): number {
    const ap = a.split('.').map((n) => parseInt(n, 10) || 0);
    const bp = b.split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(ap.length, bp.length);
    for (let i = 0; i < len; i++) {
      const d = (ap[i] || 0) - (bp[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  }
}

/**
 * 50 default skill templates inspired by nanobot-design + ai-subscription domain.
 * Categories: content (12), analysis (8), transform (8), search (6),
 *             notification (5), workflow (5), memory (3), integration (3) = 50
 */
export const DEFAULT_SKILLS: Skill[] = [
  // === Content (12) ===
  { name: 'summarize-article', version: '1.0.0', category: 'content', description: 'Summarize an article into 3-sentence digest', tags: ['summary', 'text', 'nlp'], inputs: [{ name: 'content', type: 'string', required: true, description: 'Article text' }, { name: 'maxLength', type: 'number', required: false, description: 'Max summary length in chars', default: 300 }], outputs: [{ name: 'summary', type: 'string', description: '3-sentence summary' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 3000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'extract-entities', version: '1.0.0', category: 'content', description: 'Extract named entities (people, places, orgs)', tags: ['nlp', 'entities', 'extraction'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Input text' }], outputs: [{ name: 'entities', type: 'array', description: 'Array of {type, value, confidence}' }], dependencies: [], estimatedCostUSD: 0.003, estimatedDurationMs: 4000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'classify-content', version: '1.0.0', category: 'content', description: 'Classify article into categories', tags: ['classification', 'nlp'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Article text' }, { name: 'categories', type: 'array', required: true, description: 'Candidate categories' }], outputs: [{ name: 'category', type: 'string', description: 'Best-fit category' }, { name: 'confidence', type: 'number', description: '0-1 confidence' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 2500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'generate-tags', version: '1.0.0', category: 'content', description: 'Generate 3-7 tags for an article', tags: ['tags', 'nlp', 'metadata'], inputs: [{ name: 'title', type: 'string', required: true, description: 'Article title' }, { name: 'content', type: 'string', required: true, description: 'Article content' }], outputs: [{ name: 'tags', type: 'array', description: '3-7 tag strings' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 3500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'translate-text', version: '1.0.0', category: 'content', description: 'Translate text to target language', tags: ['translation', 'i18n'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Source text' }, { name: 'targetLang', type: 'string', required: true, description: 'Target language code' }], outputs: [{ name: 'translated', type: 'string', description: 'Translated text' }], dependencies: [], estimatedCostUSD: 0.003, estimatedDurationMs: 3000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'rewrite-headline', version: '1.0.0', category: 'content', description: 'Rewrite headline to be more engaging', tags: ['copywriting', 'headline'], inputs: [{ name: 'headline', type: 'string', required: true, description: 'Original headline' }], outputs: [{ name: 'rewritten', type: 'string', description: 'New headline' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 2000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'detect-language', version: '1.0.0', category: 'content', description: 'Detect language of given text', tags: ['language', 'i18n'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Input text' }], outputs: [{ name: 'language', type: 'string', description: 'ISO 639-1 code' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 1000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'extract-keypoints', version: '1.0.0', category: 'content', description: 'Extract 3-5 key bullet points', tags: ['summary', 'bullets', 'nlp'], inputs: [{ name: 'content', type: 'string', required: true, description: 'Article content' }], outputs: [{ name: 'points', type: 'array', description: 'Key points array' }], dependencies: ['summarize-article'], estimatedCostUSD: 0.002, estimatedDurationMs: 3000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'sentiment-analysis', version: '1.0.0', category: 'content', description: 'Analyze sentiment (positive/negative/neutral)', tags: ['sentiment', 'nlp'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Input text' }], outputs: [{ name: 'sentiment', type: 'string', description: 'positive/negative/neutral' }, { name: 'score', type: 'number', description: '-1.0 to 1.0' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 2000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'paraphrase', version: '1.0.0', category: 'content', description: 'Paraphrase text while preserving meaning', tags: ['rewrite', 'nlp'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Source text' }], outputs: [{ name: 'paraphrased', type: 'string', description: 'Reworded text' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 2500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'generate-title', version: '1.0.0', category: 'content', description: 'Generate title for given content', tags: ['title', 'nlp'], inputs: [{ name: 'content', type: 'string', required: true, description: 'Content body' }], outputs: [{ name: 'title', type: 'string', description: 'Generated title' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 2000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'proofread', version: '1.0.0', category: 'content', description: 'Proofread and fix grammar/spelling', tags: ['grammar', 'editing'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Text to proofread' }], outputs: [{ name: 'corrected', type: 'string', description: 'Corrected text' }, { name: 'changes', type: 'array', description: 'List of changes made' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 2500, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Analysis (8) ===
  { name: 'topic-modeling', version: '1.0.0', category: 'analysis', description: 'Identify main topics across a corpus', tags: ['topics', 'clustering'], inputs: [{ name: 'documents', type: 'array', required: true, description: 'Document array' }, { name: 'numTopics', type: 'number', required: false, description: 'Target topic count', default: 5 }], outputs: [{ name: 'topics', type: 'array', description: 'Topic clusters' }], dependencies: ['extract-entities'], estimatedCostUSD: 0.01, estimatedDurationMs: 8000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'trend-detection', version: '1.0.0', category: 'analysis', description: 'Detect trending topics over time', tags: ['trends', 'time-series'], inputs: [{ name: 'articles', type: 'array', required: true, description: 'Articles with timestamps' }], outputs: [{ name: 'trendingTopics', type: 'array', description: 'Trending topics with scores' }], dependencies: ['topic-modeling'], estimatedCostUSD: 0.008, estimatedDurationMs: 6000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'content-similarity', version: '1.0.0', category: 'analysis', description: 'Compute similarity between two articles', tags: ['similarity', 'embedding'], inputs: [{ name: 'article1', type: 'string', required: true, description: 'First article' }, { name: 'article2', type: 'string', required: true, description: 'Second article' }], outputs: [{ name: 'similarity', type: 'number', description: '0.0-1.0 similarity' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 2000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'user-interest-profile', version: '1.0.0', category: 'analysis', description: 'Build user interest profile from reading history', tags: ['user-profile', 'interest'], inputs: [{ name: 'userId', type: 'string', required: true, description: 'User ID' }, { name: 'history', type: 'array', required: true, description: 'Reading history' }], outputs: [{ name: 'interests', type: 'array', description: 'Top interest categories' }], dependencies: ['classify-content'], estimatedCostUSD: 0.005, estimatedDurationMs: 5000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'readability-score', version: '1.0.0', category: 'analysis', description: 'Compute readability score (Flesch-Kincaid)', tags: ['readability', 'text-stats'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Text to score' }], outputs: [{ name: 'score', type: 'number', description: 'Flesch reading ease' }, { name: 'grade', type: 'string', description: 'Grade level' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'duplicate-detection', version: '1.0.0', category: 'analysis', description: 'Detect duplicate articles in a list', tags: ['deduplication', 'similarity'], inputs: [{ name: 'articles', type: 'array', required: true, description: 'Articles to check' }], outputs: [{ name: 'duplicates', type: 'array', description: 'Pairs of duplicate articles' }], dependencies: ['content-similarity'], estimatedCostUSD: 0.005, estimatedDurationMs: 4000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'quality-score', version: '1.0.0', category: 'analysis', description: 'Score article quality (length, structure, sources)', tags: ['quality', 'scoring'], inputs: [{ name: 'article', type: 'object', required: true, description: 'Article object' }], outputs: [{ name: 'score', type: 'number', description: '0-100 quality score' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 1000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'rss-feed-classify', version: '1.0.0', category: 'analysis', description: 'Classify RSS feed into topic categories', tags: ['rss', 'classification'], inputs: [{ name: 'feedUrl', type: 'string', required: true, description: 'RSS feed URL' }], outputs: [{ name: 'category', type: 'string', description: 'Best category' }], dependencies: ['classify-content'], estimatedCostUSD: 0.003, estimatedDurationMs: 3000, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Transform (8) ===
  { name: 'format-markdown', version: '1.0.0', category: 'transform', description: 'Format raw text as clean Markdown', tags: ['markdown', 'format'], inputs: [{ name: 'text', type: 'string', required: true, description: 'Raw text' }], outputs: [{ name: 'markdown', type: 'string', description: 'Formatted markdown' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 1500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'html-to-markdown', version: '1.0.0', category: 'transform', description: 'Convert HTML to clean Markdown', tags: ['html', 'markdown', 'convert'], inputs: [{ name: 'html', type: 'string', required: true, description: 'HTML source' }], outputs: [{ name: 'markdown', type: 'string', description: 'Markdown output' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 1000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'markdown-to-html', version: '1.0.0', category: 'transform', description: 'Convert Markdown to HTML', tags: ['markdown', 'html', 'convert'], inputs: [{ name: 'markdown', type: 'string', required: true, description: 'Markdown source' }], outputs: [{ name: 'html', type: 'string', description: 'HTML output' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 800, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'json-extract', version: '1.0.0', category: 'transform', description: 'Extract fields from JSON using JSONPath', tags: ['json', 'extract'], inputs: [{ name: 'json', type: 'object', required: true, description: 'Source JSON' }, { name: 'path', type: 'string', required: true, description: 'JSONPath expression' }], outputs: [{ name: 'extracted', type: 'object', description: 'Extracted data' }], dependencies: [], estimatedCostUSD: 0.0005, estimatedDurationMs: 500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'csv-parse', version: '1.0.0', category: 'transform', description: 'Parse CSV string to array of objects', tags: ['csv', 'parse'], inputs: [{ name: 'csv', type: 'string', required: true, description: 'CSV string' }, { name: 'delimiter', type: 'string', required: false, description: 'Column delimiter', default: ',' }], outputs: [{ name: 'rows', type: 'array', description: 'Parsed rows' }], dependencies: [], estimatedCostUSD: 0.0005, estimatedDurationMs: 500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'rss-parse', version: '1.0.0', category: 'transform', description: 'Parse RSS/Atom feed to articles array', tags: ['rss', 'parse', 'xml'], inputs: [{ name: 'xml', type: 'string', required: true, description: 'RSS/Atom XML' }], outputs: [{ name: 'articles', type: 'array', description: 'Parsed articles' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 1000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'opml-parse', version: '1.0.0', category: 'transform', description: 'Parse OPML subscription list', tags: ['opml', 'parse'], inputs: [{ name: 'opml', type: 'string', required: true, description: 'OPML XML' }], outputs: [{ name: 'subscriptions', type: 'array', description: 'Subscription list' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 800, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'template-render', version: '1.0.0', category: 'transform', description: 'Render template string with variables', tags: ['template', 'render'], inputs: [{ name: 'template', type: 'string', required: true, description: 'Template with {{placeholders}}' }, { name: 'vars', type: 'object', required: true, description: 'Variable map' }], outputs: [{ name: 'rendered', type: 'string', description: 'Rendered text' }], dependencies: [], estimatedCostUSD: 0.0005, estimatedDurationMs: 200, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Search (6) ===
  { name: 'semantic-search', version: '1.0.0', category: 'search', description: 'Search articles by semantic similarity', tags: ['search', 'semantic', 'embedding'], inputs: [{ name: 'query', type: 'string', required: true, description: 'Search query' }, { name: 'limit', type: 'number', required: false, description: 'Max results', default: 10 }], outputs: [{ name: 'results', type: 'array', description: 'Search results with scores' }], dependencies: [], estimatedCostUSD: 0.005, estimatedDurationMs: 4000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'keyword-search', version: '1.0.0', category: 'search', description: 'Full-text keyword search', tags: ['search', 'keyword'], inputs: [{ name: 'query', type: 'string', required: true, description: 'Search query' }], outputs: [{ name: 'results', type: 'array', description: 'Matching articles' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 800, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'find-similar-articles', version: '1.0.0', category: 'search', description: 'Find articles similar to a given one', tags: ['search', 'similarity'], inputs: [{ name: 'articleId', type: 'string', required: true, description: 'Reference article ID' }, { name: 'limit', type: 'number', required: false, description: 'Max results', default: 5 }], outputs: [{ name: 'articles', type: 'array', description: 'Similar articles' }], dependencies: ['semantic-search'], estimatedCostUSD: 0.005, estimatedDurationMs: 4000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'search-suggestions', version: '1.0.0', category: 'search', description: 'Generate query suggestions based on partial input', tags: ['search', 'autocomplete'], inputs: [{ name: 'partial', type: 'string', required: true, description: 'Partial query' }], outputs: [{ name: 'suggestions', type: 'array', description: '5 suggestion strings' }], dependencies: [], estimatedCostUSD: 0.002, estimatedDurationMs: 2000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'filter-by-date', version: '1.0.0', category: 'search', description: 'Filter articles by date range', tags: ['search', 'filter'], inputs: [{ name: 'articles', type: 'array', required: true, description: 'Articles to filter' }, { name: 'fromDate', type: 'string', required: false, description: 'Start date ISO' }, { name: 'toDate', type: 'string', required: false, description: 'End date ISO' }], outputs: [{ name: 'filtered', type: 'array', description: 'Filtered articles' }], dependencies: [], estimatedCostUSD: 0.0005, estimatedDurationMs: 300, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'rank-by-relevance', version: '1.0.0', category: 'search', description: 'Rank search results by relevance', tags: ['search', 'ranking'], inputs: [{ name: 'results', type: 'array', required: true, description: 'Search results' }, { name: 'weights', type: 'object', required: false, description: 'Ranking weights' }], outputs: [{ name: 'ranked', type: 'array', description: 'Ranked results' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 500, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Notification (5) ===
  { name: 'send-push-notification', version: '1.0.0', category: 'notification', description: 'Send push notification to user device', tags: ['push', 'notification'], inputs: [{ name: 'userId', type: 'string', required: true, description: 'Target user' }, { name: 'title', type: 'string', required: true, description: 'Notification title' }, { name: 'body', type: 'string', required: true, description: 'Notification body' }], outputs: [{ name: 'delivered', type: 'boolean', description: 'Whether delivered' }], dependencies: [], estimatedCostUSD: 0.0001, estimatedDurationMs: 200, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'send-email-digest', version: '1.0.0', category: 'notification', description: 'Compile and send email digest', tags: ['email', 'digest'], inputs: [{ name: 'userId', type: 'string', required: true, description: 'Target user' }, { name: 'articles', type: 'array', required: true, description: 'Articles to include' }], outputs: [{ name: 'sent', type: 'boolean', description: 'Whether sent' }], dependencies: ['summarize-article'], estimatedCostUSD: 0.01, estimatedDurationMs: 5000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'telegram-broadcast', version: '1.0.0', category: 'notification', description: 'Broadcast message to Telegram channel', tags: ['telegram', 'broadcast'], inputs: [{ name: 'channelId', type: 'string', required: true, description: 'Telegram channel' }, { name: 'message', type: 'string', required: true, description: 'Message text' }], outputs: [{ name: 'messageId', type: 'number', description: 'Telegram message ID' }], dependencies: [], estimatedCostUSD: 0.0001, estimatedDurationMs: 500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'webhook-fire', version: '1.0.0', category: 'notification', description: 'Fire webhook to user-configured URL', tags: ['webhook'], inputs: [{ name: 'url', type: 'string', required: true, description: 'Webhook URL' }, { name: 'payload', type: 'object', required: true, description: 'JSON payload' }], outputs: [{ name: 'statusCode', type: 'number', description: 'HTTP status code' }], dependencies: [], estimatedCostUSD: 0.0001, estimatedDurationMs: 300, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'quiet-hours-check', version: '1.0.0', category: 'notification', description: 'Check if current time is in user quiet hours', tags: ['quiet-hours', 'schedule'], inputs: [{ name: 'userId', type: 'string', required: true, description: 'User ID' }], outputs: [{ name: 'isQuiet', type: 'boolean', description: 'Whether in quiet hours' }], dependencies: [], estimatedCostUSD: 0.0001, estimatedDurationMs: 50, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Workflow (5) ===
  { name: 'trigger-workflow', version: '1.0.0', category: 'workflow', description: 'Trigger a saved workflow by ID', tags: ['workflow', 'trigger'], inputs: [{ name: 'workflowId', type: 'string', required: true, description: 'Workflow ID' }, { name: 'inputs', type: 'object', required: false, description: 'Workflow inputs' }], outputs: [{ name: 'runId', type: 'string', description: 'Workflow run ID' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 100, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'schedule-task', version: '1.0.0', category: 'workflow', description: 'Schedule a task for future execution', tags: ['schedule', 'cron'], inputs: [{ name: 'taskName', type: 'string', required: true, description: 'Task identifier' }, { name: 'cron', type: 'string', required: true, description: 'Cron expression' }], outputs: [{ name: 'jobId', type: 'string', description: 'Scheduled job ID' }], dependencies: [], estimatedCostUSD: 0.0001, estimatedDurationMs: 100, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'batch-execute', version: '1.0.0', category: 'workflow', description: 'Execute a batch of skills in parallel', tags: ['batch', 'parallel'], inputs: [{ name: 'items', type: 'array', required: true, description: 'Items to process' }, { name: 'skillName', type: 'string', required: true, description: 'Skill to apply' }], outputs: [{ name: 'results', type: 'array', description: 'Per-item results' }], dependencies: [], estimatedCostUSD: 0.01, estimatedDurationMs: 10000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'retry-with-backoff', version: '1.0.0', category: 'workflow', description: 'Retry a failed skill with exponential backoff', tags: ['retry', 'resilience'], inputs: [{ name: 'fn', type: 'object', required: true, description: 'Function to retry' }, { name: 'maxRetries', type: 'number', required: false, description: 'Max retry count', default: 3 }], outputs: [{ name: 'result', type: 'object', description: 'Final result' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 5000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'pipeline-orchestrate', version: '1.0.0', category: 'workflow', description: 'Orchestrate a DAG of skills', tags: ['pipeline', 'dag'], inputs: [{ name: 'graph', type: 'object', required: true, description: 'DAG graph definition' }], outputs: [{ name: 'outputs', type: 'object', description: 'Pipeline outputs' }], dependencies: [], estimatedCostUSD: 0.02, estimatedDurationMs: 15000, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Memory (3) ===
  { name: 'memory-store', version: '1.0.0', category: 'memory', description: 'Store item in L0-L4 memory system', tags: ['memory', 'storage'], inputs: [{ name: 'layer', type: 'string', required: true, description: 'L0/L1/L2/L3/L4' }, { name: 'key', type: 'string', required: true, description: 'Memory key' }, { name: 'value', type: 'object', required: true, description: 'Memory value' }], outputs: [{ name: 'stored', type: 'boolean', description: 'Whether stored' }], dependencies: [], estimatedCostUSD: 0.0001, estimatedDurationMs: 50, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'memory-recall', version: '1.0.0', category: 'memory', description: 'Recall memories matching query', tags: ['memory', 'recall'], inputs: [{ name: 'query', type: 'string', required: true, description: 'Recall query' }, { name: 'layers', type: 'array', required: false, description: 'Layers to search' }], outputs: [{ name: 'memories', type: 'array', description: 'Recalled memories' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 500, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'memory-consolidate', version: '1.0.0', category: 'memory', description: 'Trigger memory consolidation (dream phase)', tags: ['memory', 'dream', 'consolidation'], inputs: [{ name: 'strategy', type: 'string', required: false, description: 'Consolidation strategy', default: 'default' }], outputs: [{ name: 'consolidated', type: 'number', description: 'Items consolidated' }], dependencies: ['memory-store'], estimatedCostUSD: 0.005, estimatedDurationMs: 3000, invocationCount: 0, registeredAt: '2026-06-05' },

  // === Integration (3) ===
  { name: 'github-fetch-trending', version: '1.0.0', category: 'integration', description: 'Fetch GitHub trending repositories', tags: ['github', 'trending', 'integration'], inputs: [{ name: 'language', type: 'string', required: false, description: 'Language filter' }, { name: 'since', type: 'string', required: false, description: 'Time range: daily/weekly/monthly', default: 'daily' }], outputs: [{ name: 'repos', type: 'array', description: 'Trending repos' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 2000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'rss-fetch', version: '1.0.0', category: 'integration', description: 'Fetch and parse RSS feed', tags: ['rss', 'fetch'], inputs: [{ name: 'url', type: 'string', required: true, description: 'RSS feed URL' }], outputs: [{ name: 'articles', type: 'array', description: 'Fetched articles' }], dependencies: ['rss-parse'], estimatedCostUSD: 0.001, estimatedDurationMs: 3000, invocationCount: 0, registeredAt: '2026-06-05' },
  { name: 'mcp-tool-call', version: '1.0.0', category: 'integration', description: 'Call an MCP tool by name', tags: ['mcp', 'integration'], inputs: [{ name: 'toolName', type: 'string', required: true, description: 'MCP tool name' }, { name: 'args', type: 'object', required: true, description: 'Tool args' }], outputs: [{ name: 'result', type: 'object', description: 'Tool result' }], dependencies: [], estimatedCostUSD: 0.001, estimatedDurationMs: 1500, invocationCount: 0, registeredAt: '2026-06-05' },
];
