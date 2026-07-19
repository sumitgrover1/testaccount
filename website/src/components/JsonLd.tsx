// Renders a schema.org JSON-LD block. `object` is always our own
// server-generated data (never user input), so this is safe from injection.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
