import type { UsedCarListing } from '../types';
import { buildMeta, StrategyLog, type PageContext } from './context';
import {
  cleanText,
  findJsonLd,
  parseIndianPrice,
  parseIntegerValue,
  parseKilometres,
  textOf,
} from './html';
import {
  SPEC_PATTERNS,
  collectImages,
  findSpec,
  imagesFromJsonLd,
  jsonLdString,
  priceFromJsonLd,
  readLabelledRows,
} from './common';
import { compact, unique } from '../util';

/**
 * Parses a used-car stock page.
 *
 * Used listings carry their facts in a labelled detail block ("Kms Driven",
 * "Ownership", "Insurance") whose exact markup varies by seller type, so the
 * detail rows are read generically and then matched by *label* rather than by
 * position. That survives a column being added or reordered, which a
 * positional read would not.
 */
export function parseUsedCarListing(ctx: PageContext): UsedCarListing {
  const { $, selectors, finalUrl } = ctx;
  const sel = selectors.usedCar;
  const strategies = new StrategyLog();

  const node = findJsonLd(ctx.jsonLd, ['Car', 'Vehicle', 'Product', 'Offer']);
  if (node) strategies.mark('json-ld');

  const details = readLabelledRows($, undefined, {
    row: sel.detailRow,
    label: sel.detailLabel,
    value: sel.detailValue,
  });
  if (Object.keys(details).length) strategies.mark('css');
  const groups = { Details: details };

  const title =
    strategies.take('json-ld', jsonLdString(node?.name)) ??
    strategies.take('css', textOf($, sel.title)) ??
    cleanText($('meta[property="og:title"]').attr('content'));

  const price =
    strategies.take('json-ld', priceFromJsonLd(node)) ??
    strategies.take('css', parseIndianPrice(textOf($, sel.price)));

  const jsonLdImages = imagesFromJsonLd(node, finalUrl);
  let images = jsonLdImages;
  if (images.length) {
    strategies.mark('json-ld');
  } else {
    images = collectImages($, sel.images, finalUrl);
    if (images.length) strategies.mark('css');
  }

  // A dedicated element is trusted over the detail table when both exist: the
  // table is the fallback, not the canonical source.
  const kilometres =
    parseKilometres(textOf($, sel.kilometres)) ??
    parseKilometres(findSpec(groups, SPEC_PATTERNS.kilometres)) ??
    parseKilometres(jsonLdString(node?.mileageFromOdometer, 'value'));

  const registrationYear =
    parseIntegerValue(textOf($, sel.year)) ??
    parseIntegerValue(findSpec(groups, SPEC_PATTERNS.year)) ??
    yearFromTitle(title);

  const payload = {
    listingId: listingIdFromUrl(finalUrl),
    title,
    brand: jsonLdString(node?.brand) ?? brandFromTitle(title),
    model: jsonLdString(node?.model),
    variant: cleanText(details.Variant ?? details.variant),
    registrationYear,
    manufactureYear:
      parseIntegerValue(jsonLdString(node?.productionDate)) ??
      parseIntegerValue(details['Manufacturing Year']),
    price,
    kilometresDriven: kilometres,
    fuelType:
      textOf($, sel.fuelType) ??
      findSpec(groups, SPEC_PATTERNS.fuel) ??
      jsonLdString(node?.fuelType),
    transmission:
      textOf($, sel.transmission) ??
      findSpec(groups, SPEC_PATTERNS.transmission) ??
      jsonLdString(node?.vehicleTransmission),
    ownerCount:
      parseIntegerValue(textOf($, sel.owners)) ??
      parseOwners(findSpec(groups, SPEC_PATTERNS.owners)) ??
      parseOwners(jsonLdString(node?.numberOfPreviousOwners)),
    registrationNumber: findSpec(groups, SPEC_PATTERNS.registration),
    insuranceValidTill: findSpec(groups, SPEC_PATTERNS.insurance),
    city: textOf($, sel.city) ?? findSpec(groups, SPEC_PATTERNS.city),
    area: cleanText(details.Area ?? details.Locality),
    sellerType: textOf($, sel.sellerType),
    sellerName: textOf($, sel.sellerName),
    certified: certifiedFrom($, title),
    images,
    highlights: readHighlights(ctx),
  };

  return {
    kind: 'used_car_listing',
    meta: buildMeta(ctx, strategies.list(), payload),
    ...payload,
  };
}

function readHighlights(ctx: PageContext): string[] {
  const { $, selectors } = ctx;
  for (const selector of selectors.usedCar.highlightItem) {
    const items = unique(
      compact(
        $(selector)
          .map((_i, el) => cleanText($(el).text()))
          .get(),
      ),
    );
    if (items.length) return items.slice(0, 100);
  }
  return [];
}

/** "1st Owner", "Second owner" and a bare "2" all mean an owner count. */
function parseOwners(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const words: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
  const word = Object.keys(words).find((key) => new RegExp(`\\b${key}\\b`, 'i').test(value));
  if (word) return words[word];
  return parseIntegerValue(value);
}

/** Stock ids ride at the end of the slug, e.g. `…-swift-vxi-d1234567/`. */
function listingIdFromUrl(url: string): string | undefined {
  const path = new URL(url).pathname;
  const match = path.match(/-(?:d|s)(\d{4,})\/?$/i) ?? path.match(/-(\d{5,})\/?$/);
  return match ? match[1] : undefined;
}

function yearFromTitle(title: string | undefined): number | undefined {
  const match = title?.match(/\b(19[89]\d|20[0-4]\d)\b/);
  return match ? Number(match[1]) : undefined;
}

function brandFromTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  // Titles read "2018 Maruti Suzuki Swift VXi"; drop a leading year first.
  const words = title.replace(/^\s*\d{4}\s+/, '').split(/\s+/);
  return words.length ? words[0] : undefined;
}

function certifiedFrom($: PageContext['$'], title: string | undefined): boolean | undefined {
  const haystack = `${title ?? ''} ${$('body').text().slice(0, 4000)}`;
  if (/\bassured\b|\bcertified\b/i.test(haystack)) return true;
  return undefined;
}
