// Single source of truth for clinic branding/contact details shown across the
// site. Update the TODO-marked placeholders with real values before launch.
export const siteConfig = {
  name: 'Lumine Aesthetics',
  tagline: 'Skin, Hair & Aesthetic Care',
  description:
    'Lumine Aesthetics is a cosmetology, skin, and hair treatment clinic offering personalized, doctor-led care in Gurugram.',
  address: {
    line1: 'First Floor, Pyramid Complex, Pyramid Urban Homes 2',
    line2: 'Sector 86, Pataudi Road, Gurugram, Haryana 122012',
    mapsUrl:
      'https://www.google.com/maps?daddr=first+floor,+Pyramid+complex,+Pyramid+Urban+Homes+2,+121,+86,+Pataudi+Road,+Sector+86,+Gurugram,+Haryana+122012',
  },
  // TODO: replace with the clinic's real phone number
  phone: '+91-00000-00000',
  phoneDisplay: '+91 00000 00000',
  // TODO: replace with the clinic's real email address
  email: 'hello@lumineaesthetics.example',
  instagramUrl: 'https://www.instagram.com/lumine_aesthetics_/',
  instagramHandle: '@lumine_aesthetics_',
  // TODO: replace with real opening hours
  hours: [
    { days: 'Monday – Saturday', time: '10:00 AM – 7:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
};

export type SiteConfig = typeof siteConfig;
