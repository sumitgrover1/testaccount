// Single source of truth for clinic branding/contact details shown across the
// site. Update the TODO-marked placeholders with real values before launch.
export const siteConfig = {
  name: 'Lumine Aesthetics',
  tagline: 'Skin, Hair & Aesthetic Care',
  description:
    'Lumine Aesthetics is a cosmetology, skin, and hair treatment clinic in Gurugram offering personalized, doctor-led skin and hair care — book a consultation today.',
  city: 'Gurugram',
  // TODO: replace with the production domain once you have one — used for
  // canonical URLs, sitemap.xml, and Open Graph image resolution.
  url: 'https://www.lumineaesthetics.example',
  address: {
    line1: 'First Floor, Pyramid Complex, Pyramid Urban Homes 2',
    line2: 'Sector 86, Pataudi Road, Gurugram, Haryana 122012',
    mapsUrl:
      'https://www.google.com/maps?daddr=first+floor,+Pyramid+complex,+Pyramid+Urban+Homes+2,+121,+86,+Pataudi+Road,+Sector+86,+Gurugram,+Haryana+122012',
    mapsEmbedUrl:
      'https://maps.google.com/maps?q=Pyramid+Urban+Homes+2,+Sector+86,+Pataudi+Road,+Gurugram,+Haryana+122012&output=embed',
    // TODO: replace with real coordinates (right-click the pin on Google Maps
    // -> the two numbers shown are lat,lng) for accurate LocalBusiness SEO markup.
    latitude: 28.4211,
    longitude: 76.9635,
  },
  phone: '+91-93198-35234',
  phoneDisplay: '+91 93198 35234',
  whatsappNumber: '919319835234',
  // TODO: replace with the clinic's real email address
  email: 'hello@lumineaesthetics.example',
  instagramUrl: 'https://www.instagram.com/lumine_aesthetics_/',
  instagramHandle: '@lumine_aesthetics_',
  // TODO: replace with real opening hours
  hours: [
    { days: 'Monday – Saturday', time: '10:00 AM – 7:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
  // Structured-data opening hours in schema.org format (day abbreviations + 24h times).
  hoursSchema: [
    { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '19:00' },
  ],
};

export type SiteConfig = typeof siteConfig;

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
