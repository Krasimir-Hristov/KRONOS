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
          background: 'linear-gradient(135deg, #06b6d4 0%, #4f46e5 55%, #7c3aed 100%)',
          color: '#ffffff',
          fontSize: 300,
          fontWeight: 900,
        }}
      >
        K
      </div>
    ),
    size
  );

export default Icon;
