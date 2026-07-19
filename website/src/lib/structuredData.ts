import { siteConfig } from '@/config/site';

// schema.org LocalBusiness (MedicalBusiness subtype) markup — helps Google
// show the clinic in local/map search results with address, hours, and
// contact details attached directly to the search result.
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.address.line1,
      addressLocality: siteConfig.city,
      addressRegion: 'Haryana',
      postalCode: '122012',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: siteConfig.address.latitude,
      longitude: siteConfig.address.longitude,
    },
    openingHoursSpecification: siteConfig.hoursSchema.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dayOfWeek,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: [siteConfig.instagramUrl],
  };
}

export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
