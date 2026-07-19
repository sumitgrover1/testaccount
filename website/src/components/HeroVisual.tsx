import { Droplet, Heart, Sparkles } from 'lucide-react';

// A decorative, CSS/SVG-only visual for the hero — no photography needed.
// Swap this out for a real clinic/treatment photo later by replacing this
// component's usage in app/page.tsx with an <Image>/<img> pointed at a
// file dropped into public/.
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-100 via-brand-200 to-brand-400 opacity-60 blur-2xl" />
      <div className="absolute inset-8 rounded-full border border-brand-200 bg-gradient-to-br from-cream-50 to-brand-50 shadow-inner" />
      <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
        <Sparkles className="h-10 w-10" aria-hidden />
      </div>
      <div className="absolute left-8 top-10 flex h-14 w-14 items-center justify-center rounded-full bg-cream-50 text-brand-600 shadow-md">
        <Droplet className="h-6 w-6" aria-hidden />
      </div>
      <div className="absolute bottom-10 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-cream-50 text-brand-600 shadow-md">
        <Heart className="h-6 w-6" aria-hidden />
      </div>
    </div>
  );
}
