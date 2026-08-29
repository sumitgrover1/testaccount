import {
  RobotsPolicy,
  isPathAllowed,
  parseRobotsTxt,
  selectGroup,
  userAgentToken,
} from '../../src/scrapers/carwale/http/robots';

const SAMPLE = `
# a comment
User-agent: *
Disallow: /private/
Allow: /private/public-bit/
Crawl-delay: 5

User-agent: carwale-scraper
User-agent: friendly-bot
Disallow: /used/*/contact$
Crawl-delay: 2

Sitemap: https://www.carwale.com/sitemap.xml
Sitemap: https://www.carwale.com/sitemap-news.xml
`;

describe('parseRobotsTxt', () => {
  const robots = parseRobotsTxt(SAMPLE);

  it('groups consecutive user-agent lines into one rule block', () => {
    expect(robots.groups).toHaveLength(2);
    expect(robots.groups[1].userAgents).toEqual(['carwale-scraper', 'friendly-bot']);
  });

  it('collects sitemaps and crawl-delays', () => {
    expect(robots.sitemaps).toHaveLength(2);
    expect(robots.groups[0].crawlDelaySec).toBe(5);
    expect(robots.groups[1].crawlDelaySec).toBe(2);
  });

  it('treats an empty Disallow as no restriction rather than as "/"', () => {
    const parsed = parseRobotsTxt('User-agent: *\nDisallow:');
    expect(parsed.groups[0].rules).toEqual([]);
    expect(isPathAllowed(parsed.groups[0], '/anything').allowed).toBe(true);
  });
});

describe('selectGroup', () => {
  const robots = parseRobotsTxt(SAMPLE);

  it('picks the named group over the wildcard one', () => {
    expect(selectGroup(robots, 'carwale-scraper/1.0 (+contact)')?.userAgents).toContain(
      'carwale-scraper',
    );
  });

  it('falls back to the wildcard group for an unlisted agent', () => {
    expect(selectGroup(robots, 'some-other-bot/2')?.userAgents).toEqual(['*']);
  });

  it('extracts the token a robots.txt would name', () => {
    expect(userAgentToken('carwale-scraper/1.0 (+https://example.test)')).toBe('carwale-scraper');
  });
});

describe('isPathAllowed', () => {
  const wildcardGroup = parseRobotsTxt(SAMPLE).groups[0];
  const namedGroup = parseRobotsTxt(SAMPLE).groups[1];

  it('applies longest-match-wins so a nested Allow beats a broad Disallow', () => {
    expect(isPathAllowed(wildcardGroup, '/private/secret').allowed).toBe(false);
    expect(isPathAllowed(wildcardGroup, '/private/public-bit/page').allowed).toBe(true);
  });

  it('honours * wildcards and the $ end anchor', () => {
    expect(isPathAllowed(namedGroup, '/used/mumbai/contact').allowed).toBe(false);
    // The $ anchor means the rule does not extend to deeper paths.
    expect(isPathAllowed(namedGroup, '/used/mumbai/contact/form').allowed).toBe(true);
  });

  it('lets Allow win an equal-length tie', () => {
    const group = parseRobotsTxt('User-agent: *\nDisallow: /x\nAllow: /x').groups[0];
    expect(isPathAllowed(group, '/x').allowed).toBe(true);
  });

  it('allows everything when no group applies', () => {
    expect(isPathAllowed(undefined, '/anything').allowed).toBe(true);
  });
});

describe('RobotsPolicy', () => {
  const policy = (status: number, body = SAMPLE): RobotsPolicy =>
    new RobotsPolicy('carwale-scraper/1.0', async () => ({ status, body }));

  it('enforces the matching group and reports the deciding rule', async () => {
    const decision = await policy(200).isAllowed('https://www.carwale.com/used/mumbai/contact');
    expect(decision.allowed).toBe(false);
    expect(decision.rule?.pattern).toBe('/used/*/contact$');
  });

  it('exposes the group crawl-delay in milliseconds', async () => {
    await expect(policy(200).crawlDelayMs('https://www.carwale.com/')).resolves.toBe(2000);
  });

  it('permits everything when robots.txt is missing', async () => {
    const decision = await policy(404, '').isAllowed('https://www.carwale.com/private/x');
    expect(decision.allowed).toBe(true);
  });

  it('refuses to crawl when robots.txt cannot be read', async () => {
    // A 5xx means "unknown", and the safe reading of unknown is "do not crawl".
    await expect(policy(503, '').isAllowed('https://www.carwale.com/')).resolves.toEqual({
      allowed: false,
    });

    const throwing = new RobotsPolicy('ua', async () => {
      throw new Error('network down');
    });
    await expect(throwing.isAllowed('https://www.carwale.com/')).resolves.toEqual({
      allowed: false,
    });
  });

  it('fetches robots.txt once per origin', async () => {
    const fetchText = jest.fn(async () => ({ status: 200, body: SAMPLE }));
    const cached = new RobotsPolicy('carwale-scraper/1.0', fetchText);
    await cached.isAllowed('https://www.carwale.com/a');
    await cached.isAllowed('https://www.carwale.com/b');
    await cached.crawlDelayMs('https://www.carwale.com/c');
    expect(fetchText).toHaveBeenCalledTimes(1);
  });
});
