import {
  classifyUrl,
  dedupeKey,
  extractLinks,
  isSameSite,
  looksLikeHtml,
  normalizeUrl,
} from '../../src/scrapers/carwale/crawl/urls';
import { loadHtml } from '../../src/scrapers/carwale/parse/html';
import { defaultSelectors } from '../../src/scrapers/carwale/parse/selectors';

describe('normalizeUrl', () => {
  it('drops fragments and campaign parameters but keeps meaningful ones', () => {
    expect(
      normalizeUrl('https://www.carwale.com/used/?utm_source=x&city=mumbai&gclid=abc#results'),
    ).toBe('https://www.carwale.com/used/?city=mumbai');
  });

  it('orders query parameters so one page is one URL', () => {
    expect(normalizeUrl('https://a.test/x?b=2&a=1')).toBe(normalizeUrl('https://a.test/x?a=1&b=2'));
  });

  it('lower-cases the host, collapses duplicate slashes and resolves relatives', () => {
    expect(normalizeUrl('/swift//images/', 'https://WWW.CarWale.com/maruti-cars/')).toBe(
      'https://www.carwale.com/swift/images/',
    );
  });

  it('rejects non-HTTP schemes and unparseable input', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeUrl('mailto:a@b.test')).toBeUndefined();
    expect(normalizeUrl('not a url')).toBeUndefined();
  });
});

describe('dedupeKey', () => {
  it('treats a trailing slash and letter case as the same page', () => {
    expect(dedupeKey('https://a.test/Swift/')).toBe(dedupeKey('https://a.test/swift'));
  });

  it('keeps pages with different queries apart', () => {
    expect(dedupeKey('https://a.test/x?p=2')).not.toBe(dedupeKey('https://a.test/x?p=3'));
  });
});

describe('isSameSite', () => {
  it('accepts subdomains of the base site and rejects look-alikes', () => {
    const base = 'https://www.carwale.com';
    expect(isSameSite('https://images.carwale.com/a', base)).toBe(true);
    expect(isSameSite('https://carwale.com/a', base)).toBe(true);
    expect(isSameSite('https://carwale.com.evil.test/a', base)).toBe(false);
    expect(isSameSite('https://notcarwale.com/a', base)).toBe(false);
  });
});

describe('looksLikeHtml', () => {
  it('rejects asset URLs', () => {
    expect(looksLikeHtml('https://a.test/x/photo.jpg')).toBe(false);
    expect(looksLikeHtml('https://a.test/x/app.js')).toBe(false);
    expect(looksLikeHtml('https://a.test/maruti-cars/swift/')).toBe(true);
  });
});

describe('classifyUrl', () => {
  it.each([
    ['https://www.carwale.com/maruti-suzuki-cars/swift/', 'new_car_model'],
    ['https://www.carwale.com/used/cars-in-mumbai/marutisuzuki-swift-2018-d1234567/', 'used_car_listing'],
    ['https://www.carwale.com/maruti-suzuki-cars/swift/expert-review/', 'review'],
    ['https://www.carwale.com/news/some-launch-story/', 'news_article'],
    ['https://www.carwale.com/maruti-suzuki-cars/dealers/', 'dealer'],
    ['https://www.carwale.com/', 'unclassified_page'],
  ])('classifies %s as %s', (url, expected) => {
    expect(classifyUrl(url)).toBe(expected);
  });

  it('prefers the most specific pattern when several match', () => {
    // Sits under /used/ (a listing prefix) but is a detail page.
    expect(classifyUrl('https://www.carwale.com/used/cars-in-pune/honda-city-2016-d99887/')).toBe(
      'used_car_listing',
    );
  });
});

describe('extractLinks', () => {
  const html = `
    <html><body>
      <header><a href="/nav-only/">Nav</a></header>
      <main>
        <a href="/maruti-suzuki-cars/swift/">Swift</a>
        <a href="/maruti-suzuki-cars/swift/?utm_source=home">Swift again</a>
        <a href="https://external.test/page">External</a>
        <a href="/brochure.pdf">Brochure</a>
        <a href="javascript:void(0)">JS</a>
        <a href="#section">Anchor</a>
      </main>
      <footer><a href="/footer-only/">Footer</a></footer>
    </body></html>`;

  it('keeps in-scope document links only, de-duplicated after normalisation', () => {
    const links = extractLinks(loadHtml(html), 'https://www.carwale.com/', 'https://www.carwale.com', {
      ignoredContainers: defaultSelectors.common.ignoredLinkContainers,
    });
    expect(links.map((link) => link.url)).toEqual([
      'https://www.carwale.com/maruti-suzuki-cars/swift/',
    ]);
    expect(links[0].kind).toBe('new_car_model');
    expect(links[0].anchorText).toBe('Swift');
  });

  it('includes chrome links when no containers are ignored', () => {
    const links = extractLinks(loadHtml(html), 'https://www.carwale.com/', 'https://www.carwale.com');
    expect(links.map((link) => link.url)).toContain('https://www.carwale.com/nav-only/');
    expect(links.map((link) => link.url)).toContain('https://www.carwale.com/footer-only/');
  });
});
