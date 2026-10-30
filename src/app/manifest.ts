import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  name: 'KRONOS — Семеен AI Асистент & Архив',
  short_name: 'KRONOS',
  description: 'Личен и семеен AI асистент, документен сейф и финансов съветник.',
  start_url: '/',
  display: 'standalone',
  background_color: '#020617',
  theme_color: '#f59e0b',
});

export default manifest;
