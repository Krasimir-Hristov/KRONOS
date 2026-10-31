import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: 'KRONOS — AI Асистент & Документен Сейф',
  short_name: 'KRONOS',
  description:
    'Личен модулен AI асистент, документен сейф (DE/BG/EL) и криптирана памет за данни и пароли.',
  start_url: '/',
  display: 'standalone',
  background_color: '#020617',
  theme_color: '#f59e0b',
});

export default manifest;
