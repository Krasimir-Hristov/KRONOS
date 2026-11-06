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
          background: 'linear-gradient(135deg, #06b6d4 0%, #4f46e5 55%, #7c3aed 100%)',
          color: '#ffffff',
          fontSize: 110,
          fontWeight: 900,
        }}
      >
        K
      </div>
    ),
    size
  );

export default AppleIcon;
