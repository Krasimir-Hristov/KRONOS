import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PinPadScreen } from '@/features/auth';
import { getUserPinStatus } from '@/features/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/supabaseServer';

export const metadata: Metadata = {
  title: '4-Цифрен ПИН',
  description: 'Банково отключване на KRONOS с 4-цифрен ПИН код.',
};

const PinPage: React.FC = async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const status = await getUserPinStatus(user.id);

  if (status.isError) {
    return (
      <div className="w-full max-w-sm mx-auto p-6 text-center rounded-3xl border border-rose-500/30 bg-rose-950/20 text-rose-300">
        <h1 className="text-lg font-bold mb-2">Грешка при зареждане</h1>
        <p className="text-sm">
          {status.errorMessage ?? 'Неуспешна проверка на ПИН профила. Моля, опитайте отново по-късно.'}
        </p>
      </div>
    );
  }

  return <PinPadScreen initialHasPin={status.hasPin} />;
};

export default PinPage;
