import type { TranslationDictionary } from '@/i18n/bgDictionary';

export const elDictionary: TranslationDictionary = {
  app: {
    title: 'KRONOS — Βοηθός AI, Αρχείο RAG Εγγράφων & Μνήμη',
    subtitle: 'Το σύστημα που εξοικονομεί χρόνο',
    languageLabel: 'Αλλαγή γλώσσας διεπαφής',
    pinProtectedBadge: 'Προστασία με 4-ψήφιο PIN',
  },
  nav: {
    mainAriaLabel: 'Κύρια πλοήγηση KRONOS',
    mobileAriaLabel: 'Κάτω πλοήγηση κινητού',
    overview: 'Πίνακας',
    chat: 'Βοηθός AI',
    documents: 'Έγγραφα',
    finance: 'Δεδομένα & Κωδικοί',
    family: 'Αιτήσεις Online',
  },
  degradation: {
    aiUnavailableTitle: 'Οι υπηρεσίες AI είναι προσωρινά μη διαθέσιμες',
    aiUnavailableBody:
      'Λόγω τεχνικών λόγων η σύνδεση με τα μοντέλα AI έχει διακοπεί προσωρινά. Η αναζήτηση εγγράφων, η προβολή, η λήψη ZIP και η διαχείριση δεδομένων/κωδικών λειτουργούν στο 100%.',
  },
  sections: {
    overviewHeading: 'Καλώς ήρθατε στο KRONOS',
    overviewDescription:
      'Προσωπικό AI Bot και Admin RAG Αρχείο για έγγραφα (DE / BG / EL), κρυπτογραφημένους κωδικούς και βοήθεια με Wohngeld, Kinderzuschlag και online πύλες.',
    openModuleLabel: 'Άνοιγμα ενότητας',
    chatTitle: 'Κύριος Βοηθός AI (/chat)',
    chatDescription:
      'LangGraph Supervisor με αναζήτηση δύο ζωνών Jev, ανάλυση επιστολών/screenshots από online πύλες και διαχείριση δεδομένων.',
    documentsTitle: 'Αρχείο RAG Εγγράφων (/documents)',
    documentsDescription:
      'Άμεση μαζική μεταφόρτωση Drag & Drop έως 50 MB χωρίς chat, άμεση αναζήτηση SQL + διανυσμάτων, λήψη μεμονωμένων/ZIP αρχείων και προαιρετική ένωση PDF.',
    financeTitle: 'Δεδομένα & Κωδικοί',
    financeDescription:
      'Αποθηκευμένα στοιχεία (Steuer-ID, IBAN με αντιγραφή 1-κλικ και αναφορά στο έγγραφο) και κρυπτογραφημένοι κωδικοί AES-256-GCM με PIN.',
    familyTitle: 'Προετοιμασία Online Αιτήσεων',
    familyDescription:
      'Γρήγορη εύρεση εγγράφων τελευταίων 3–6 μηνών ως ξεχωριστά αρχεία για online πύλες ή καθοδήγηση βήμα προς βήμα σε αιτήσεις PDF.',
    phaseReadyBadge: 'KRONOS — Ο πυρήνας και η ασφάλεια είναι ενεργά',
  },
};
