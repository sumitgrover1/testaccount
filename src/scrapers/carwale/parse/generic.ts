import type { DealerRecord, NewsArticle, ReviewRecord, UnclassifiedPage } from '../types';
import { buildMeta, StrategyLog, type PageContext } from './context';
import { cleanText, findJsonLd, jsonLdTypes, parseNumber, textOf, type Nodes } from './html';
import { jsonLdString, ratingFromJsonLd } from './common';
import { compact, unique } from '../util';

export function parseDealer(ctx: PageContext): DealerRecord {
  const { $, selectors } = ctx;
  const sel = selectors.dealer;
  const strategies = new StrategyLog();

  const node = findJsonLd(ctx.jsonLd, ['AutoDealer', 'LocalBusiness', 'Organization', 'Place']);
  if (node) strategies.mark('json-ld');
  const address = (node?.address ?? {}) as Record<string, unknown>;
  const geo = (node?.geo ?? {}) as Record<string, unknown>;

  const payload = {
    name: strategies.take('json-ld', jsonLdString(node?.name)) ?? strategies.take('css', textOf($, sel.name)),
    brand: jsonLdString(node?.brand),
    addressLine:
      jsonLdString(address.streetAddress, 'streetAddress') ?? textOf($, sel.address),
    city: jsonLdString(address.addressLocality, 'addressLocality') ?? textOf($, sel.city),
    state: jsonLdString(address.addressRegion, 'addressRegion'),
    postalCode: jsonLdString(address.postalCode, 'postalCode'),
    phone:
      jsonLdString(node?.telephone) ??
      cleanText($('a[href^="tel:"]').first().attr('href')?.replace(/^tel:/, '')) ??
      textOf($, sel.phone),
    latitude: parseNumber(String(geo.latitude ?? '')),
    longitude: parseNumber(String(geo.longitude ?? '')),
    rating: ratingFromJsonLd(node),
  };

  return { kind: 'dealer', meta: buildMeta(ctx, strategies.list(), payload), ...payload };
}

/**
 * Review pages carry many reviews. Only the first is returned as *the* record
 * for the page; the rest are emitted by the crawler as sibling records so that
 * one URL can yield many rows without the parser knowing about output.
 */
export function parseReviews(ctx: PageContext): ReviewRecord[] {
  const { $, selectors } = ctx;
  const sel = selectors.review;
  const out: ReviewRecord[] = [];

  const structured = ctx.jsonLd.filter((node) => {
    const type = node['@type'];
    return type === 'Review' || (Array.isArray(type) && type.includes('Review'));
  });

  for (const node of structured) {
    const rating = node.reviewRating as Record<string, unknown> | undefined;
    const payload = {
      subject: jsonLdString(node.itemReviewed),
      author: jsonLdString(node.author),
      publishedAt: jsonLdString(node.datePublished, 'datePublished'),
      rating: rating
        ? {
            value: parseNumber(String(rating.ratingValue ?? '')),
            best: parseNumber(String(rating.bestRating ?? '')),
          }
        : undefined,
      title: jsonLdString(node.name),
      body: jsonLdString(node.reviewBody, 'reviewBody'),
    };
    out.push({ kind: 'review', meta: buildMeta(ctx, ['json-ld'], payload), ...payload });
  }

  if (out.length) return out;

  for (const containerSelector of sel.container) {
    $(containerSelector).each((_i, el) => {
      const card = $(el) as Nodes;
      const body = textOf($, sel.body, card);
      if (!body) return;
      const payload = {
        subject: cleanText($('h1').first().text()),
        author: textOf($, sel.author, card),
        publishedAt:
          cleanText(card.find('time').first().attr('datetime')) ?? textOf($, sel.date, card),
        rating: { value: parseNumber(textOf($, sel.rating, card)) },
        title: textOf($, sel.title, card),
        body,
      };
      out.push({ kind: 'review', meta: buildMeta(ctx, ['css'], payload), ...payload });
    });
    if (out.length) break;
  }

  return out;
}

export function parseArticle(ctx: PageContext): NewsArticle {
  const { $, selectors } = ctx;
  const sel = selectors.article;
  const strategies = new StrategyLog();

  const node = findJsonLd(ctx.jsonLd, ['NewsArticle', 'Article', 'BlogPosting', 'Report']);
  if (node) strategies.mark('json-ld');

  const payload = {
    headline:
      strategies.take('json-ld', jsonLdString(node?.headline, 'headline')) ??
      strategies.take('css', textOf($, sel.headline)),
    author: jsonLdString(node?.author) ?? textOf($, sel.author),
    publishedAt:
      jsonLdString(node?.datePublished, 'datePublished') ??
      cleanText($('time[datetime]').first().attr('datetime')) ??
      textOf($, sel.date),
    summary:
      jsonLdString(node?.description, 'description') ??
      cleanText($(selectors.common.description.join(',')).first().attr('content')),
    body: jsonLdString(node?.articleBody, 'articleBody') ?? readArticleBody(ctx),
    tags: unique(
      compact(
        sel.tag.flatMap((selector) =>
          $(selector)
            .map((_i, el) => cleanText($(el).text()))
            .get(),
        ),
      ),
    ),
  };

  return { kind: 'news_article', meta: buildMeta(ctx, strategies.list(), payload), ...payload };
}

function readArticleBody(ctx: PageContext): string | undefined {
  const { $, selectors } = ctx;
  for (const selector of selectors.article.body) {
    const container = $(selector).first();
    if (!container.length) continue;
    // Paragraph-wise rather than `.text()`, so sentences do not run together
    // where the markup had block boundaries.
    const paragraphs = compact(
      container
        .find('p')
        .map((_i, el) => cleanText($(el).text()))
        .get(),
    );
    const text = paragraphs.length ? paragraphs.join('\n\n') : cleanText(container.text());
    if (text) return text;
  }
  return undefined;
}

/**
 * The fallback for a page the classifier did not recognise. It records the
 * JSON-LD types the page declares, which is the fastest way to find out what
 * an unmodelled section actually contains and whether it is worth a parser.
 */
export function parseUnclassified(ctx: PageContext): UnclassifiedPage {
  const { $, selectors } = ctx;
  const payload = {
    title: textOf($, selectors.common.title),
    jsonLdTypes: jsonLdTypes(ctx.jsonLd),
  };
  return { kind: 'unclassified_page', meta: buildMeta(ctx, [], payload), ...payload };
}
