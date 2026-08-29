import type { NewCarModel, SpecGroups, VariantSummary } from '../types';
import { buildMeta, StrategyLog, type PageContext } from './context';
import {
  absoluteUrl,
  cleanText,
  parseIndianPrice,
  parseIntegerValue,
  parseNumber,
  textOf,
  findJsonLd,
  type Nodes,
} from './html';
import {
  SPEC_PATTERNS,
  collectImages,
  findSpec,
  imagesFromJsonLd,
  jsonLdString,
  priceFromJsonLd,
  ratingFromJsonLd,
  readLabelledRows,
} from './common';
import { compact, unique } from '../util';

/**
 * Parses a new-car model page.
 *
 * Order of preference is structured data first, DOM second, for every field
 * independently: a page that ships a complete JSON-LD `Car` block is parsed
 * without touching a single CSS selector, and one that ships a partial block
 * has only its gaps filled from the DOM. That mix is recorded in
 * `meta.strategies`, so a drop in JSON-LD coverage is visible in the output.
 */
export function parseNewCarModel(ctx: PageContext): NewCarModel {
  const { $, selectors, finalUrl } = ctx;
  const sel = selectors.newCarModel;
  const strategies = new StrategyLog();

  const node = findJsonLd(ctx.jsonLd, ['Car', 'Vehicle', 'Product', 'IndividualProduct']);
  if (node) strategies.mark('json-ld');

  const specifications = readSpecGroups(ctx);
  const keySpecs = readKeySpecs(ctx);
  if (Object.keys(keySpecs).length) specifications['Key Specifications'] = keySpecs;
  if (Object.keys(specifications).length) strategies.mark('css');

  const title =
    strategies.take('json-ld', jsonLdString(node?.name)) ??
    strategies.take('css', textOf($, sel.title)) ??
    cleanText($('meta[property="og:title"]').attr('content'));

  const brand =
    strategies.take('json-ld', jsonLdString(node?.brand)) ??
    strategies.take('css', textOf($, sel.brand)) ??
    brandFromUrl(finalUrl);

  const price =
    strategies.take('json-ld', priceFromJsonLd(node)) ??
    strategies.take('css', parseIndianPrice(textOf($, sel.price)));

  const cssRatingValue = parseNumber(textOf($, sel.rating));
  const cssRatingCount = parseIntegerValue(textOf($, sel.ratingCount));
  const rating =
    strategies.take('json-ld', ratingFromJsonLd(node)) ??
    (cssRatingValue !== undefined || cssRatingCount !== undefined
      ? strategies.take('css', { value: cssRatingValue, count: cssRatingCount })
      : undefined);

  const jsonLdImages = imagesFromJsonLd(node, finalUrl);
  let images = jsonLdImages;
  if (images.length) {
    strategies.mark('json-ld');
  } else {
    images = collectImages($, sel.images, finalUrl);
    if (images.length) strategies.mark('css');
  }

  const payload = {
    brand,
    model: modelFromTitle(title, brand) ?? modelFromUrl(finalUrl),
    title,
    price,
    bodyType: findSpec(specifications, SPEC_PATTERNS.bodyType),
    fuelTypes: splitMulti(findSpec(specifications, SPEC_PATTERNS.fuel)),
    transmissions: splitMulti(findSpec(specifications, SPEC_PATTERNS.transmission)),
    seatingCapacity: parseIntegerValue(findSpec(specifications, SPEC_PATTERNS.seating)),
    mileageKmpl: parseNumber(findSpec(specifications, SPEC_PATTERNS.mileage)),
    engineCc: parseIntegerValue(findSpec(specifications, SPEC_PATTERNS.engine)),
    maxPowerBhp: parseNumber(findSpec(specifications, SPEC_PATTERNS.power)),
    maxTorqueNm: parseNumber(findSpec(specifications, SPEC_PATTERNS.torque)),
    rating,
    description:
      jsonLdString(node?.description, 'description') ??
      cleanText($(selectors.common.description.join(',')).first().attr('content')) ??
      textOf($, sel.description),
    images,
    variants: readVariants(ctx),
    specifications,
    features: readFeatures(ctx),
  };

  return {
    kind: 'new_car_model',
    meta: buildMeta(ctx, strategies.list(), payload),
    ...payload,
  };
}

/**
 * Spec tables are grouped ("Engine & Transmission", "Dimensions", …). The
 * group heading is looked for inside the container first and immediately
 * before it second, because both layouts — caption-inside and heading-above —
 * are common and losing the heading would collapse every group into one.
 */
function readSpecGroups(ctx: PageContext): SpecGroups {
  const { $, selectors } = ctx;
  const sel = selectors.newCarModel;
  const groups: SpecGroups = {};

  for (const groupSelector of sel.specGroup) {
    const containers = $(groupSelector);
    if (!containers.length) continue;

    containers.each((index, el) => {
      const container = $(el) as Nodes;
      const heading =
        textOf($, sel.specGroupTitle, container) ??
        cleanText(container.prevAll(sel.specGroupTitle.join(',')).first().text()) ??
        `Group ${index + 1}`;

      const fields = readLabelledRows($, container, {
        row: sel.specRow,
        label: sel.specLabel,
        value: sel.specValue,
      });
      if (Object.keys(fields).length) {
        groups[heading] = { ...(groups[heading] ?? {}), ...fields };
      }
    });

    if (Object.keys(groups).length) break;
  }

  return groups;
}

function readKeySpecs(ctx: PageContext): Record<string, string> {
  const { $, selectors } = ctx;
  const sel = selectors.newCarModel;
  const out: Record<string, string> = {};

  for (const itemSelector of sel.keySpecItem) {
    const items = $(itemSelector);
    if (!items.length) continue;
    items.each((_i, el) => {
      const item = $(el) as Nodes;
      const label = textOf($, sel.keySpecLabel, item);
      const value = textOf($, sel.keySpecValue, item);
      if (label && value && label !== value) out[label] = value;
    });
    if (Object.keys(out).length) break;
  }

  return out;
}

function readVariants(ctx: PageContext): VariantSummary[] {
  const { $, selectors, finalUrl } = ctx;
  const sel = selectors.newCarModel;
  const variants: VariantSummary[] = [];

  for (const rowSelector of sel.variantRow) {
    const rows = $(rowSelector);
    if (!rows.length) continue;

    rows.each((_i, el) => {
      const row = $(el) as Nodes;
      const name = textOf($, sel.variantName, row);
      if (!name) return;
      const href = row.find(sel.variantLink.join(',')).first().attr('href');
      variants.push({
        name,
        url: absoluteUrl(finalUrl, href),
        price: parseIndianPrice(textOf($, sel.variantPrice, row)),
        fuelType: textOf($, sel.variantFuel, row),
        transmission: textOf($, sel.variantTransmission, row),
      });
    });

    if (variants.length) break;
  }

  // The same variant often appears in both a comparison table and a price
  // list; keyed de-duplication keeps whichever row carried a price.
  const byName = new Map<string, VariantSummary>();
  for (const variant of variants) {
    const existing = byName.get(variant.name);
    if (!existing || (!existing.price && variant.price)) byName.set(variant.name, variant);
  }
  return [...byName.values()];
}

function readFeatures(ctx: PageContext): string[] {
  const { $, selectors } = ctx;
  for (const selector of selectors.newCarModel.featureItem) {
    const items = $(selector)
      .map((_i, el) => cleanText($(el).text()))
      .get();
    const features = unique(compact(items));
    if (features.length) return features.slice(0, 200);
  }
  return [];
}

/** "Petrol / Diesel / CNG" and "Petrol, Diesel" both mean a list, not one value. */
function splitMulti(value: string | undefined): string[] {
  if (!value) return [];
  return unique(compact(value.split(/[/,|]|\band\b/i).map((part) => cleanText(part))));
}

/** `/maruti-suzuki-cars/swift/` -> "Maruti Suzuki" when nothing better is on the page. */
function brandFromUrl(url: string): string | undefined {
  const match = new URL(url).pathname.match(/^\/([a-z0-9-]+)-cars\//i);
  return match ? titleCase(match[1].replace(/-/g, ' ')) : undefined;
}

function modelFromUrl(url: string): string | undefined {
  const match = new URL(url).pathname.match(/^\/[a-z0-9-]+-cars\/([a-z0-9-]+)\/?/i);
  return match ? titleCase(match[1].replace(/-/g, ' ')) : undefined;
}

function modelFromTitle(title: string | undefined, brand: string | undefined): string | undefined {
  if (!title) return undefined;
  if (!brand) return title;
  const stripped = title.replace(new RegExp(`^${escapeRegExp(brand)}\\s*`, 'i'), '');
  return cleanText(stripped) ?? title;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}
