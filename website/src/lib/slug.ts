// Tiny, URL-safe slug helper — used to turn a free-text Treatment.category
// string (e.g. "Laser Hair Reduction") into a route segment
// ("laser-hair-reduction") for /services/[category]. There's no slug field
// on the backend Treatment model, so this is derived consistently on the
// website side wherever a category needs a URL.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
