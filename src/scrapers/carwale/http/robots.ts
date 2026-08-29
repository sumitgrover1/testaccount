/**
 * A self-contained robots.txt parser (RFC 9309 shaped).
 *
 * Written in-repo rather than pulled from npm because the matching rules are
 * small, the semantics are worth having under test in this codebase, and a
 * crawler's compliance layer is the last place to want an unaudited transitive
 * dependency.
 */

export interface RobotsRule {
  type: 'allow' | 'disallow';
  /** The raw path pattern, which may contain `*` and a trailing `$`. */
  pattern: string;
}

export interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
  crawlDelaySec?: number;
}

export interface RobotsTxt {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export function parseRobotsTxt(body: string): RobotsTxt {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  // Consecutive User-agent lines share one rule block; the first directive
  // after them closes the header and starts a new group on the next agent.
  let acceptingAgents = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    switch (field) {
      case 'user-agent': {
        if (!current || !acceptingAgents) {
          current = { userAgents: [], rules: [] };
          groups.push(current);
          acceptingAgents = true;
        }
        current.userAgents.push(value.toLowerCase());
        break;
      }
      case 'allow':
      case 'disallow': {
        if (!current) break;
        acceptingAgents = false;
        // "Disallow:" with an empty value means "nothing is disallowed" and
        // must not be treated as the prefix "" (which would match everything).
        if (field === 'disallow' && value === '') break;
        current.rules.push({ type: field, pattern: value });
        break;
      }
      case 'crawl-delay': {
        if (!current) break;
        acceptingAgents = false;
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed) && parsed >= 0) current.crawlDelaySec = parsed;
        break;
      }
      case 'sitemap': {
        // Sitemap is a global directive: valid outside any group.
        if (value) sitemaps.push(value);
        break;
      }
      default:
        break;
    }
  }

  return { groups, sitemaps };
}

/** The UA token a robots.txt would name, e.g. "carwale-scraper/1.0 (+…)" -> "carwale-scraper". */
export function userAgentToken(userAgent: string): string {
  return userAgent.split('/')[0].split(/\s/)[0].toLowerCase();
}

/**
 * Picks the group whose user-agent line best matches ours. Per the spec the
 * most specific (longest) matching token wins, and `*` is the fallback only
 * when no named group matches — a named group is never merged with `*`.
 */
export function selectGroup(robots: RobotsTxt, userAgent: string): RobotsGroup | undefined {
  const token = userAgentToken(userAgent);
  let best: { group: RobotsGroup; score: number } | undefined;
  let wildcard: RobotsGroup | undefined;

  for (const group of robots.groups) {
    for (const agent of group.userAgents) {
      if (agent === '*') {
        wildcard = wildcard ?? group;
        continue;
      }
      if (token.startsWith(agent) || agent.startsWith(token)) {
        const score = agent.length;
        if (!best || score > best.score) best = { group, score };
      }
    }
  }

  return best?.group ?? wildcard;
}

/** Translates a robots path pattern into a regex, honouring `*` and a trailing `$`. */
function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  // Escape everything, then re-open `*` as a lazy-free wildcard. Splitting on
  // `*` (rather than a replace over an escaped string) keeps the expression
  // linear and free of nested quantifiers.
  const source = body
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^]*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`);
}

export interface RobotsDecision {
  allowed: boolean;
  /** The rule that decided it, for logging. Absent when nothing matched. */
  rule?: RobotsRule;
}

/**
 * Longest-match-wins, Allow beating Disallow on an equal-length tie — the
 * behaviour Google and the RFC both specify.
 */
export function isPathAllowed(group: RobotsGroup | undefined, path: string): RobotsDecision {
  if (!group) return { allowed: true };
  let winner: { rule: RobotsRule; length: number } | undefined;

  for (const rule of group.rules) {
    if (!patternToRegex(rule.pattern).test(path)) continue;
    const length = rule.pattern.replace(/\$$/, '').length;
    const beatsOnLength = !winner || length > winner.length;
    const beatsOnTie =
      winner && length === winner.length && rule.type === 'allow' && winner.rule.type === 'disallow';
    if (beatsOnLength || beatsOnTie) winner = { rule, length };
  }

  if (!winner) return { allowed: true };
  return { allowed: winner.rule.type === 'allow', rule: winner.rule };
}

/**
 * Per-origin robots.txt state: fetched once, then answers checks from memory.
 * A fetch failure is recorded as "no restrictions known" *except* for 5xx,
 * where the conservative reading (and Google's) is to treat the site as
 * disallowed rather than assume the absence of rules.
 */
export class RobotsPolicy {
  private readonly cache = new Map<string, { robots: RobotsTxt; group?: RobotsGroup } | 'blocked'>();

  constructor(
    private readonly userAgent: string,
    private readonly fetchText: (url: string) => Promise<{ status: number; body: string }>,
  ) {}

  private async load(origin: string): Promise<{ robots: RobotsTxt; group?: RobotsGroup } | 'blocked'> {
    const cached = this.cache.get(origin);
    if (cached) return cached;

    let entry: { robots: RobotsTxt; group?: RobotsGroup } | 'blocked';
    try {
      const { status, body } = await this.fetchText(`${origin}/robots.txt`);
      if (status >= 500) {
        entry = 'blocked';
      } else if (status >= 400) {
        // 404 means "no robots.txt", which permits everything.
        entry = { robots: { groups: [], sitemaps: [] } };
      } else {
        const robots = parseRobotsTxt(body);
        entry = { robots, group: selectGroup(robots, this.userAgent) };
      }
    } catch {
      entry = 'blocked';
    }

    this.cache.set(origin, entry);
    return entry;
  }

  async isAllowed(url: string): Promise<RobotsDecision> {
    const parsed = new URL(url);
    const entry = await this.load(parsed.origin);
    if (entry === 'blocked') return { allowed: false };
    return isPathAllowed(entry.group, parsed.pathname + parsed.search);
  }

  async crawlDelayMs(url: string): Promise<number | undefined> {
    const entry = await this.load(new URL(url).origin);
    if (entry === 'blocked' || entry.group?.crawlDelaySec === undefined) return undefined;
    return Math.round(entry.group.crawlDelaySec * 1000);
  }

  async sitemaps(origin: string): Promise<string[]> {
    const entry = await this.load(origin);
    return entry === 'blocked' ? [] : entry.robots.sitemaps;
  }
}
