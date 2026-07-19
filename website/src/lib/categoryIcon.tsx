import { Activity, Heart, Scissors, Sparkles, TrendingDown, UserRound, Zap } from 'lucide-react';

// A small badge rendering an icon representing a treatment/blog category —
// a lightweight visual cue without needing real photography for every
// category. Each icon is rendered as a static JSX tag (never assigned to a
// variable and used as a dynamic tag) since resolving a component
// reference at render time trips the react-hooks/static-components rule.
export function CategoryIconBadge({ category, className = 'h-4 w-4' }: { category: string; className?: string }) {
  if (/laser/i.test(category)) return <Zap className={className} aria-hidden />;
  if (/hair/i.test(category)) return <Scissors className={className} aria-hidden />;
  if (/skin/i.test(category)) return <Sparkles className={className} aria-hidden />;
  if (/weight/i.test(category)) return <TrendingDown className={className} aria-hidden />;
  if (/body/i.test(category)) return <Activity className={className} aria-hidden />;
  if (/bridal/i.test(category)) return <Heart className={className} aria-hidden />;
  if (/men/i.test(category)) return <UserRound className={className} aria-hidden />;
  return <Sparkles className={className} aria-hidden />;
}

// Blog categories come from the backend as enum values (e.g.
// "WEIGHT_MANAGEMENT") — format them for display (e.g. "Weight Management").
export function formatCategoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
