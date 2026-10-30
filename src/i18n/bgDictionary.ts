export const bgDictionary = {
  app: {
    title: 'KRONOS — Личен & Семеен AI Асистент и Архив',
    subtitle: 'Системата, която пести време',
    languageLabel: 'Смяна на езика на интерфейса',
    pinProtectedBadge: 'Защитено с 15-мин Банков ПИН',
  },
  nav: {
    mainAriaLabel: 'Основна навигация на KRONOS',
    mobileAriaLabel: 'Мобилна долна навигация',
    overview: 'Начало',
    chat: 'AI Чат',
    documents: 'Документи',
    finance: 'Финанси',
    family: 'Семейство',
  },
  degradation: {
    aiUnavailableTitle: 'AI услугите са временно недостъпни',
    aiUnavailableBody:
      'Поради технически причини връзката с AI моделите е временно прекъсната. Търсенето на документи, прегледът, свалянето, принтирането и семейният списък за пазаруване работят на 100%.',
  },
  sections: {
    overviewHeading: 'Добре дошли в KRONOS v4',
    overviewDescription:
      'Единен семеен сейф за документи, интелигентен AI диспечер (Jev + LangGraph) и споделен семеен център.',
    openModuleLabel: 'Отвори модул',
    chatTitle: 'Личен AI Асистент (/chat)',
    chatDescription:
      'Ежедневен чат за двата профила, спешен превод през камера и режим Учител с ПИН катинар за трите деца.',
    documentsTitle: 'Сейф & Мигновена Търсачка (/documents)',
    documentsDescription:
      'Качване на снимки и PDF, конвертор Снимки към PDF, автоматичен OCR за Kontoauszüge и мигновени SQL филтри.',
    financeTitle: 'Финансов Съветник (/finance)',
    financeDescription:
      'Месечен анализ върху банкови извлечения (Kontoauszüge) и бързо отчитане на плащания в брой от касови бележки.',
    familyTitle: 'Семеен Център (/family)',
    familyDescription:
      'Споделен списък за супермаркет в реално време, профили на децата за Учителя и запазени музикални плейлисти.',
    phaseReadyBadge: 'Фаза 0 — Ядрото и защитата са активни',
  },
};

export type TranslationDictionary = typeof bgDictionary;
