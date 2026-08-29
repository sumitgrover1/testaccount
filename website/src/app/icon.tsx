import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

// Simple monogram favicon — replace with a real logo file (icon.png/svg
// dropped into src/app/) once the clinic has one.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#c85c73',
          borderRadius: 12,
          color: 'white',
          fontSize: 36,
          fontFamily: 'Georgia, serif',
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
