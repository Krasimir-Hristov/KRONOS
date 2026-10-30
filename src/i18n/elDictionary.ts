import type { TranslationDictionary } from '@/i18n/bgDictionary';

export const elDictionary: TranslationDictionary = {
  app: {
    title: 'KRONOS — Προσωπικός & Οικογενειακός Βοηθός AI και Αρχείο',
    subtitle: 'Το σύστημα που εξοικονομεί χρόνο',
    languageLabel: 'Αλλαγή γλώσσας διεπαφής',
    pinProtectedBadge: 'Προστασία με Τραπεζικό PIN 15 λεπτών',
  },
  nav: {
    mainAriaLabel: 'Κύρια πλοήγηση KRONOS',
    mobileAriaLabel: 'Κάτω πλοήγηση κινητού',
    overview: 'Αρχική',
    chat: 'AI Συνομιλία',
    documents: 'Έγγραφα',
    finance: 'Οικονομικά',
    family: 'Οικογένεια',
  },
  degradation: {
    aiUnavailableTitle: 'Οι υπηρεσίες AI είναι προσωρινά μη διαθέσιμες',
    aiUnavailableBody:
      'Λόγω τεχνικών λόγων η σύνδεση με τα μοντέλα AI έχει διακοπεί προσωρινά. Η αναζήτηση εγγράφων, η προβολή, η λήψη, η εκτύπωση και η οικογενειακή λίστα αγορών λειτουργούν στο 100%.',
  },
  sections: {
    overviewHeading: 'Καλώς ήρθατε στο KRONOS v4',
    overviewDescription:
      'Ενιαίο οικογενειακό θησαυροφυλάκιο εγγράφων, έξυπνος δρομολογητής AI (Jev + LangGraph) και οικογενειακό κέντρο.',
    openModuleLabel: 'Άνοιγμα ενότητας',
    chatTitle: 'Προσωπικός Βοηθός AI (/chat)',
    chatDescription:
      'Καθημερινή συνομιλία για τα δύο προφίλ, άμεση μετάφραση με κάμερα και λειτουργία Δασκάλου με κλείδωμα PIN για τα τρία παιδιά.',
    documentsTitle: 'Θησαυροφυλάκιο & Άμεση Αναζήτηση (/documents)',
    documentsDescription:
      'Μεταφόρτωση φωτογραφιών και PDF, μετατροπέας Φωτογραφιών σε PDF, αυτόματο OCR για Kontoauszüge και φίλτρα SQL.',
    financeTitle: 'Οικονομικός Σύμβουλος (/finance)',
    financeDescription:
      'Μηνιαία ανάλυση τραπεζικών κινήσεων (Kontoauszüge) και γρήγορη καταγραφή πληρωμών μετρητών από αποδείξεις.',
    familyTitle: 'Οικογενειακό Κέντρο (/family)',
    familyDescription:
      'Κοινόχρηστη λίστα αγορών σε πραγματικό χρόνο, προφίλ των παιδιών για τον Δάσκαλο και αποθηκευμένες λίστες μουσικής.',
    phaseReadyBadge: 'Φάση 0 — Ο πυρήνας και η ασφάλεια είναι ενεργά',
  },
};
