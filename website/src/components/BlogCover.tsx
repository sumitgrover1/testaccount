import { CategoryIconBadge } from '@/lib/categoryIcon';

// A deterministic, CSS/SVG-only "cover image" for each blog article — never
// a photograph, so there's no copyright risk. The look (gradient, blob
// positions, icon tilt) is derived from a hash of the post's slug, so it's
// distinct per article but always the same on the card and the article
// page for a given post. Use size="hero" for the wider article-page banner.
const GRADIENTS = [
  'bg-gradient-to-br from-brand-100 via-brand-200 to-brand-400',
  'bg-gradient-to-br from-brand-50 via-brand-300 to-brand-600',
  'bg-gradient-to-br from-cream-100 via-brand-200 to-brand-500',
  'bg-gradient-to-br from-brand-200 via-brand-400 to-brand-700',
  'bg-gradient-to-br from-cream-50 via-brand-100 to-brand-300',
];

const ICON_TILTS = [
  'group-hover:rotate-0',
  'group-hover:rotate-6',
  'group-hover:-rotate-6',
  'group-hover:rotate-12',
  'group-hover:-rotate-12',
];

const BLOB_A_POSITIONS = ['top-[-20%] right-[-10%]', 'top-[-10%] left-[-15%]'];
const BLOB_B_POSITIONS = ['bottom-[-25%] left-[-10%]', 'bottom-[-15%] right-[-15%]'];

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function BlogCover({
  slug,
  category,
  size = 'card',
}: {
  slug: string;
  category: string;
  size?: 'card' | 'hero';
}) {
  const hash = hashSlug(slug);
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const tilt = ICON_TILTS[Math.floor(hash / GRADIENTS.length) % ICON_TILTS.length];
  const blobA = BLOB_A_POSITIONS[hash % BLOB_A_POSITIONS.length];
  const blobB = BLOB_B_POSITIONS[Math.floor(hash / 7) % BLOB_B_POSITIONS.length];

  return (
    <div className={`relative overflow-hidden ${gradient} ${size === 'hero' ? 'aspect-[21/9]' : 'aspect-[16/9]'}`}>
      <div className={`absolute h-32 w-32 rounded-full bg-white/20 blur-2xl ${blobA}`} aria-hidden />
      <div className={`absolute h-24 w-24 rounded-full bg-white/10 blur-xl ${blobB}`} aria-hidden />
      <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out ${tilt} group-hover:scale-110`}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 text-brand-700 shadow-sm backdrop-blur-sm">
          <CategoryIconBadge category={category} className={size === 'hero' ? 'h-8 w-8' : 'h-7 w-7'} />
        </span>
      </div>
    </div>
  );
}
