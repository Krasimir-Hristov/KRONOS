export const bgDictionary = {
  app: {
    title: 'KRONOS — AI Асистент, Документен RAG Сейф & Памет',
    subtitle: 'Системата, която пести време',
    languageLabel: 'Смяна на езика на интерфейса',
    pinProtectedBadge: 'Защитено с 4-цифрен ПИН',
  },
  nav: {
    mainAriaLabel: 'Основна навигация на KRONOS',
    mobileAriaLabel: 'Мобилна долна навигация',
    overview: 'Табло',
    chat: 'AI Асистент',
    documents: 'Документи',
    finance: 'Данни & Пароли',
    family: 'Онлайн Молби',
  },
  degradation: {
    aiUnavailableTitle: 'AI услугите са временно недостъпни',
    aiUnavailableBody:
      'Поради технически причини връзката с AI моделите е временно прекъсната. Търсенето на документи, прегледът, свалянето, ZIP пакетите и ръчното управление на данни и пароли работят на 100%.',
  },
  sections: {
    overviewHeading: 'Добре дошли в KRONOS',
    overviewDescription:
      'Личен AI Бот и Admin RAG Сейф за документи (DE / BG / EL), криптирани данни и пароли, и помощ при Wohngeld, Kinderzuschlag и немски онлайн портали.',
    openModuleLabel: 'Отвори секция',
    chatTitle: 'Главен AI Асистент (/chat)',
    chatDescription:
      'LangGraph Supervisor с Jev Двузоново търсене, разчитане на писма и скрийншоти от онлайн портали, и управление на данни и пароли.',
    documentsTitle: 'Документен RAG Сейф (/documents)',
    documentsDescription:
      'Директно масово Drag & Drop качване на документи до 50 MB без чат, мигновена SQL + векторна търсачка, индивидуално/ZIP сваляне и PDF обединяване по избор.',
    financeTitle: 'Лични Данни & Пароли',
    financeDescription:
      'Запомнени данни (Steuer-ID, IBAN с 1-клик копиране и референция към документа) и AES-256-GCM криптирани пароли със Step-Up ПИН.',
    familyTitle: 'Подготовка за Онлайн Портали & Молби',
    familyDescription:
      'Бързо извличане на документи за последните 3–6 месеца като отделни файлове за онлайн кандидатстване или водене поле по поле по PDF молби.',
    phaseReadyBadge: 'KRONOS — Основата и защитата са активни',
  },
};

export type TranslationDictionary = typeof bgDictionary;
