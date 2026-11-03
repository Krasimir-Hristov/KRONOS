import React from 'react';

interface AuthLayoutProps {
  readonly children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
      {children}
    </main>
  );
};

export default AuthLayout;
