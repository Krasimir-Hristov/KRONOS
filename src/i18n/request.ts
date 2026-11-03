import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'bg';

  return {
    locale,
    messages: (await import('../../messages/bg.json')).default,
  };
});
