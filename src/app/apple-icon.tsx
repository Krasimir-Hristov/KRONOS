import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 } as const;
export const contentType = 'image/png';

const AppleIcon = (): ImageResponse =>
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
          border: '6px solid #14b8a6',
          borderRadius: 40,
          color: '#2dd4bf',
          fontSize: 104,
          fontWeight: 900,
        }}
      >
        K
      </div>
    ),
    size
  );

export default AppleIcon;
