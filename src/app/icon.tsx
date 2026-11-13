import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 } as const;
export const contentType = 'image/png';

const Icon = (): ImageResponse =>
  new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 50%, #0f292a 0%, #070b0e 75%)',
          border: '16px solid #14b8a6',
          borderRadius: 112,
          color: '#2dd4bf',
          fontSize: 280,
          fontWeight: 900,
          letterSpacing: '-0.05em',
        }}
      >
        K
      </div>
    ),
    size
  );

export default Icon;
