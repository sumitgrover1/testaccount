import fs from 'fs';
import path from 'path';
import {
  extractEmbeddedJson,
  extractJsonLd,
  loadHtml,
  parseIndianPrice,
  parseKilometres,
  parseNumber,
} from '../../src/scrapers/carwale/parse/html';
import { createPageContext } from '../../src/scrapers/carwale/parse/context';
import { defaultSelectors, mergeSelectors } from '../../src/scrapers/carwale/parse/selectors';
import { parseNewCarModel } from '../../src/scrapers/carwale/parse/new-car';
import { parseUsedCarListing } from '../../src/scrapers/carwale/parse/used-car';

const fixture = (name: string): string =>
  fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

describe('parseIndianPrice', () => {
  it('scales a lakh range and applies the unit to both bounds', () => {
    expect(parseIndianPrice('₹ 6.49 - 9.14 Lakh')).toEqual({
      min: 649_000,
      max: 914_000,
      label: '₹ 6.49 - 9.14 Lakh',
      currency: 'INR',
    });
  });

  it('handles crore, plain rupees and en-dash ranges', () => {
    expect(parseIndianPrice('Rs. 1.25 Crore')?.min).toBe(12_500_000);
    expect(parseIndianPrice('₹ 8,50,000')?.min).toBe(850_000);
    expect(parseIndianPrice('₹ 5.00 – 7.50 Lakh')?.max).toBe(750_000);
  });

  it('does not treat a second, unrelated number as a range bound', () => {
    // "12 variants" must not become the upper bound of the price.
    const parsed = parseIndianPrice('₹ 6.49 Lakh onwards, 12 variants');
    expect(parsed?.min).toBe(649_000);
    expect(parsed?.max).toBe(649_000);
  });

  it('returns undefined when there is no number', () => {
    expect(parseIndianPrice('Price on request')).toBeUndefined();
    expect(parseIndianPrice(undefined)).toBeUndefined();
  });
});

describe('numeric helpers', () => {
  it('reads the first number, ignoring units and commas', () => {
    expect(parseNumber('1,197 cc')).toBe(1197);
    expect(parseNumber('88.50bhp@5700rpm')).toBe(88.5);
    expect(parseNumber('no digits here')).toBeUndefined();
  });

  it('resolves kilometre suffixes', () => {
    expect(parseKilometres('45,000 km')).toBe(45_000);
    expect(parseKilometres('45k km')).toBe(45_000);
    expect(parseKilometres('0.45 Lakh km')).toBe(45_000);
  });
});

describe('extractJsonLd', () => {
  it('flattens @graph and survives a malformed block alongside a valid one', () => {
    const nodes = extractJsonLd(loadHtml(fixture('new-car-model.html')));
    expect(nodes.map((node) => node['@type'])).toEqual(['BreadcrumbList', 'Car']);
  });
});

describe('extractEmbeddedJson', () => {
  it('brace-matches past braces that appear inside string values', () => {
    const html = `<script>window.__STATE__ = {"title":"a } brace","nested":{"ok":true}};</script>`;
    expect(extractEmbeddedJson(html, ['window.__STATE__'])).toEqual({
      title: 'a } brace',
      nested: { ok: true },
    });
  });

  it('returns undefined when the variable is absent', () => {
    expect(extractEmbeddedJson('<html></html>', ['window.__STATE__'])).toBeUndefined();
  });
});

describe('parseNewCarModel', () => {
  const ctx = createPageContext({
    url: 'https://www.carwale.com/maruti-suzuki-cars/swift/',
    status: 200,
    html: fixture('new-car-model.html'),
    selectors: defaultSelectors,
  });
  const record = parseNewCarModel(ctx);

  it('prefers JSON-LD for identity, price and rating', () => {
    expect(record.title).toBe('Maruti Suzuki Swift');
    expect(record.brand).toBe('Maruti Suzuki');
    expect(record.model).toBe('Swift');
    expect(record.price).toMatchObject({ min: 649_000, max: 914_000, currency: 'INR' });
    expect(record.rating).toMatchObject({ value: 4.3, count: 1200 });
    expect(record.meta.strategies).toContain('json-ld');
  });

  it('resolves relative JSON-LD images against the page URL', () => {
    expect(record.images).toEqual([
      'https://www.carwale.com/images/swift-front.jpg',
      'https://cdn.example.com/swift-rear.jpg',
    ]);
  });

  it('keeps spec groups separate and reads their headings', () => {
    expect(Object.keys(record.specifications).sort()).toEqual([
      'Dimensions & Weight',
      'Engine & Transmission',
      'Key Specifications',
    ]);
    expect(record.specifications['Engine & Transmission']['Max Power']).toBe('88.50bhp@5700rpm');
  });

  it('derives typed fields from spec labels regardless of which group they sit in', () => {
    expect(record.mileageKmpl).toBe(23.2);
    expect(record.engineCc).toBe(1197);
    expect(record.maxPowerBhp).toBe(88.5);
    expect(record.maxTorqueNm).toBe(113);
    expect(record.seatingCapacity).toBe(5);
    expect(record.bodyType).toBe('Hatchback');
    expect(record.fuelTypes).toEqual(['Petrol', 'CNG']);
    expect(record.transmissions).toEqual(['Manual', 'Automatic']);
  });

  it('reads variants with absolute URLs and de-duplicates features', () => {
    expect(record.variants).toEqual([
      {
        name: 'Swift LXi',
        url: 'https://www.carwale.com/maruti-suzuki-cars/swift/lxi/',
        price: expect.objectContaining({ min: 649_000 }),
        fuelType: undefined,
        transmission: undefined,
      },
      {
        name: 'Swift ZXi Plus',
        url: 'https://www.carwale.com/maruti-suzuki-cars/swift/zxi-plus/',
        price: expect.objectContaining({ min: 914_000 }),
        fuelType: undefined,
        transmission: undefined,
      },
    ]);
    expect(record.features).toEqual(['Touchscreen Infotainment', 'Cruise Control']);
  });

  it('hashes the payload, not the page, so unrelated markup churn does not look like a change', () => {
    const withNoise = createPageContext({
      url: 'https://www.carwale.com/maruti-suzuki-cars/swift/',
      status: 200,
      html: fixture('new-car-model.html').replace('</body>', '<div id="ad-42"></div></body>'),
      selectors: defaultSelectors,
    });
    expect(parseNewCarModel(withNoise).meta.contentHash).toBe(record.meta.contentHash);
  });

  it('falls back to the DOM when the page ships no structured data', () => {
    const stripped = fixture('new-car-model.html').replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
      '',
    );
    const domOnly = parseNewCarModel(
      createPageContext({
        url: 'https://www.carwale.com/maruti-suzuki-cars/swift/',
        status: 200,
        html: stripped,
        selectors: defaultSelectors,
      }),
    );
    expect(domOnly.meta.strategies).not.toContain('json-ld');
    expect(domOnly.title).toBe('Maruti Suzuki Swift');
    expect(domOnly.price).toMatchObject({ min: 649_000, max: 914_000 });
    expect(domOnly.brand).toBe('Maruti Suzuki');
  });
});

describe('parseUsedCarListing', () => {
  const record = parseUsedCarListing(
    createPageContext({
      url: 'https://www.carwale.com/used/cars-in-mumbai/marutisuzuki-swift-2018-d1234567/',
      status: 200,
      html: fixture('used-car-listing.html'),
      selectors: defaultSelectors,
    }),
  );

  it('reads the detail block by label rather than by position', () => {
    expect(record.kilometresDriven).toBe(45_000);
    expect(record.fuelType).toBe('Petrol');
    expect(record.transmission).toBe('Manual');
    expect(record.ownerCount).toBe(1);
    expect(record.registrationYear).toBe(2018);
    expect(record.registrationNumber).toBe('MH-02');
    expect(record.variant).toBe('VXi');
  });

  it('recovers the stock id from the URL and the price from the DOM', () => {
    expect(record.listingId).toBe('1234567');
    expect(record.price).toMatchObject({ min: 475_000 });
    expect(record.city).toBe('Mumbai');
  });

  it('collects lazy-loaded images and ignores the base64 placeholders', () => {
    expect(record.images).toEqual([
      'https://www.carwale.com/photos/swift-1.jpg',
      'https://www.carwale.com/photos/swift-2.jpg',
    ]);
  });
});

describe('mergeSelectors', () => {
  it('replaces a field list rather than appending to it', () => {
    const merged = mergeSelectors(defaultSelectors, { newCarModel: { title: ['.custom'] } });
    expect(merged.newCarModel.title).toEqual(['.custom']);
    // Untouched fields keep their defaults.
    expect(merged.newCarModel.price).toEqual(defaultSelectors.newCarModel.price);
    expect(merged.usedCar.title).toEqual(defaultSelectors.usedCar.title);
  });
});
