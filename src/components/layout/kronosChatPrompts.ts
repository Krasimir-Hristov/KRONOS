export const CHAT_STARTER_PROMPTS = [
  {
    id: 'kinderzuschlag',
    title: 'Писмо за Kinderzuschlag',
    subtitle: 'Какви документи ми искат и до кога е срокът?',
    prompt:
      'Качвам формуляра от Familienkasse за Kinderzuschlag. Какво точно трябва да попълня и какви документи да прикача?',
  },
  {
    id: 'kontoauszuege',
    title: 'Банкови извлечения за портал',
    subtitle: 'Подготви последните 3 Kontoauszüge като отделни файлове',
    prompt:
      'Подготви ми последните банкови извлечения от Sparkasse за онлайн портала на Wohngeld, без да ги слепваш в един PDF.',
  },
  {
    id: 'steuer-iban',
    title: 'Справка за Steuer-ID и IBAN',
    subtitle: 'Покажи ми личните данни с 1-клик копиране',
    prompt:
      'Извади ми моя Steuer-ID, Kindergeldnummer и IBAN от сейфа, за да ги копирам във формуляра.',
  },
  {
    id: 'mietvertrag',
    title: 'Проверка на Kaltmiete и Nebenkosten',
    subtitle: 'Данни от договора за наем (Mietvertrag)',
    prompt:
      'Колко точно ми е Kaltmiete и Heizkosten според последния договор за наем и писмото от наемодателя?',
  },
] as const;
