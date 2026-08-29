// Indian pricing is read in lakh and crore, not in millions — every price on the
// site goes through this so the whole product speaks the buyer's units.
export function formatPrice(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)} Lakh`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatCompact(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
