import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

// Site-wide default social-share card (og:image / twitter:image), rendered
// at request time rather than a photograph — there are no real clinic
// photos wired up yet (see the Gallery page's placeholder tiles), and this
// keeps the card on-brand and copyright-free, matching the code-generated
// approach used for blog cover images. Any route can override this by
// adding its own opengraph-image.tsx; nothing else needs to change.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #5a3fa8 0%, #4b3494 45%, #281b52 100%)',
          color: '#fdfbf7',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 60,
            background: 'rgba(253, 251, 247, 0.15)',
            fontSize: 56,
            fontWeight: 700,
            marginBottom: 36,
          }}
        >
          <span>L</span>
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
          <span>{siteConfig.name}</span>
        </div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 32, color: '#d3cbf0' }}>
          <span>{siteConfig.tagline}</span>
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 24, color: '#b3a3e3' }}>
          <span>{siteConfig.city}, India</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
