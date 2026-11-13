export interface MockDocumentHighlightField {
  readonly label: string;
  readonly value: string;
  readonly status: 'verified' | 'required';
}

export interface MockDocumentAttachment {
  readonly id: string;
  readonly title: string;
  readonly sender: string;
  readonly docDate: string;
  readonly uploadedAt: string;
  readonly fileSize: string;
  readonly zone: 'zone1' | 'zone2' | 'uploaded';
  readonly badge: string;
  readonly referenceCode: string;
  readonly previewSummary: string;
  readonly previewParagraphs: readonly string[];
  readonly highlightedFields: readonly MockDocumentHighlightField[];
}

export interface MockExtractedFact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly sourceDocTitle: string;
}

export interface MockChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
  readonly responseDuration?: string;
  readonly modelTag?: string;
  readonly userUploadedDoc?: MockDocumentAttachment;
  readonly documents?: readonly MockDocumentAttachment[];
  readonly facts?: readonly MockExtractedFact[];
}

export interface MockConversationSession {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly updatedAtLabel: string;
  readonly messages: readonly MockChatMessage[];
}

export interface SidebarPlaceholderLink {
  readonly id: string;
  readonly labelKey: string;
  readonly badgeKey: string;
  readonly hintKey: string;
  readonly label?: string;
  readonly badge?: string;
  readonly hint?: string;
}
