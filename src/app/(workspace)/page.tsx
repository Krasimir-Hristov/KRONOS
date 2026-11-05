import React from 'react';
import type { Metadata } from 'next';
import { requireAuthAndPin } from '@/features/auth/server';
import {
  AssistantWorkspace,
  type AssistantWorkspaceSnapshot,
} from '@/features/assistant';
import { loadAssistantWorkspaceSnapshot } from '@/features/assistant/server';

export const metadata: Metadata = {
  title: 'AI Асистент & Главен Център',
  description:
    'Главен AI Асистент KRONOS с двузоново Jev търсене (Зона 1 + Зона 2), лични данни и помощ за немска бюрокрация.',
};

const loadInitialWorkspace = async (): Promise<{
  readonly snapshot?: AssistantWorkspaceSnapshot;
  readonly error: string | null;
}> => {
  try {
    const snapshot = await loadAssistantWorkspaceSnapshot(null);
    return { snapshot, error: null };
  } catch (err) {
    console.error('[WorkspaceHomePage] Failed to load assistant snapshot:', err);
    return {
      snapshot: undefined,
      error: 'Неуспешно първоначално зареждане на разговорите.',
    };
  }
};

const WorkspaceHomePage: React.FC = async () => {
  await requireAuthAndPin();
  const initial = await loadInitialWorkspace();

  return (
    <AssistantWorkspace
      initialSnapshot={initial.snapshot}
      initialLoadError={initial.error}
    />
  );
};

export default WorkspaceHomePage;
