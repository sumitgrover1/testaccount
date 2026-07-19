import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Dynamically generated social-share card (Facebook/WhatsApp/Twitter link
// previews) — no photography needed, and updates automatically if the
// clinic name/tagline in site.ts ever changes.
export default function OpengraphImage() {
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
          background: 'linear-gradient(135deg, #fdf2f4 0%, #f5c6cf 100%)',
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 600,
            color: '#87344a',
            fontFamily: 'Georgia, serif',
          }}
        >
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 36, color: '#6b2a3c', marginTop: 20 }}>{siteConfig.tagline}</div>
        <div style={{ fontSize: 24, color: '#a8435a', marginTop: 40 }}>{siteConfig.city}</div>
      </div>
    ),
    { ...size },
  );
}
