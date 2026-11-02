import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PinPadScreen } from '@/features/auth';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('pin_hash')
    .eq('id', user.id)
    .single();

  const hasPin = Boolean(profile?.pin_hash);

  return <PinPadScreen initialHasPin={hasPin} />;
};

export default PinPage;
