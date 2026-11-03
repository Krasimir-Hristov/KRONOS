import React from 'react';
import { requireAuthAndPin } from '@/features/auth/server';
import { AppShell } from '@/components/layout/AppShell';

interface WorkspaceLayoutProps {
  readonly children: React.ReactNode;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = async ({ children }) => {
  await requireAuthAndPin();

  return <AppShell>{children}</AppShell>;
};

export default WorkspaceLayout;
