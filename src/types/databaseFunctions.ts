import type { Json } from './databaseTypes';

export type SearchDocumentRpcRow = {
  created_at: string;
  doc_date: string | null;
  doc_type: string;
  expires_at: string | null;
  file_size_bytes: number;
  id: string;
  metadata: Json;
  mime_type: string;
  original_file_name: string;
  processing_status: string;
  relevance_score: number;
  sender: string;
  storage_path: string;
  summary_text: string;
  title: string;
  topic: string;
  updated_at: string;
};

export type PublicDatabaseFunctions = {
  save_deduplicated_vault_facts: {
    Args: { p_candidates?: Json; p_source_document_id: string };
    Returns: {
      inserted_count: number;
      skipped_duplicates: number;
    }[];
  };
  search_documents_classic: {
    Args: {
      p_doc_type?: string;
      p_limit?: number;
      p_offset?: number;
      p_only_approved?: boolean;
      p_query?: string;
      p_sort_by?: string;
      p_topic?: string;
    };
    Returns: SearchDocumentRpcRow[];
  };
  search_documents_hybrid: {
    Args: {
      p_date_from?: string;
      p_date_to?: string;
      p_doc_type?: string;
      p_limit?: number;
      p_query?: string;
      p_query_embedding?: string;
      p_topic?: string;
    };
    Returns: SearchDocumentRpcRow[];
  };
};
