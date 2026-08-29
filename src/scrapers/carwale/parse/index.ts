import type { RecordKind, ScrapeRecord } from '../types';
import type { PageContext } from './context';
import { parseNewCarModel } from './new-car';
import { parseUsedCarListing } from './used-car';
import { parseArticle, parseDealer, parseReviews, parseUnclassified } from './generic';

export * from './context';
export * from './selectors';

/**
 * One page can legitimately produce several records (a review page holds many
 * reviews), so the dispatcher always returns an array. An empty array is never
 * returned: a page that yields nothing still emits an `unclassified_page`, so
 * "we fetched it and got nothing" is visible in the dataset rather than
 * silent.
 */
export function parsePage(kind: RecordKind, ctx: PageContext): ScrapeRecord[] {
  switch (kind) {
    case 'new_car_model':
      return [parseNewCarModel(ctx)];
    case 'used_car_listing':
      return [parseUsedCarListing(ctx)];
    case 'dealer':
      return [parseDealer(ctx)];
    case 'review': {
      const reviews = parseReviews(ctx);
      return reviews.length ? reviews : [parseUnclassified(ctx)];
    }
    case 'news_article':
      return [parseArticle(ctx)];
    default:
      return [parseUnclassified(ctx)];
  }
}
