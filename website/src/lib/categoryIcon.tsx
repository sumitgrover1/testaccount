import { Activity, Heart, Scissors, Sparkles, TrendingDown, UserRound, Zap, type LucideIcon } from 'lucide-react';

// Maps a treatment's free-text category (set from the admin panel) to a
// representative icon — a lightweight visual cue without needing real
// photography for every category.
const ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /laser/i, icon: Zap },
  { match: /hair/i, icon: Scissors },
  { match: /skin/i, icon: Sparkles },
  { match: /body/i, icon: Activity },
  { match: /weight/i, icon: TrendingDown },
  { match: /bridal/i, icon: Heart },
  { match: /men/i, icon: UserRound },
];

export function getCategoryIcon(category: string): LucideIcon {
  return ICONS.find((entry) => entry.match.test(category))?.icon ?? Sparkles;
}
