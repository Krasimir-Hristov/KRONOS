import React from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Вход',
  description: 'Вход с имейл и парола в личната система KRONOS.',
};

const LoginPage: React.FC = () => {
  return <LoginForm />;
};

export default LoginPage;
