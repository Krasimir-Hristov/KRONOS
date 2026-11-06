import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: 'KRONOS — AI Асистент & Документен Сейф',
  short_name: 'KRONOS',
  description:
    'Личен модулен AI асистент, документен сейф (DE/BG/EL) и криптирана памет за данни и пароли.',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#020617',
  theme_color: '#f59e0b',
  icons: [
    { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
  ],
});

export default manifest;
