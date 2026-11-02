export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          sender_role: string;
          session_id: string;
          zone1_document_ids: string[];
          zone2_document_ids: string[];
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          sender_role: string;
          session_id: string;
          zone1_document_ids?: string[];
          zone2_document_ids?: string[];
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          sender_role?: string;
          session_id?: string;
          zone1_document_ids?: string[];
          zone2_document_ids?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'chat_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_sessions: {
        Row: {
          created_at: string;
          id: string;
          owner_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          owner_id: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          owner_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_sessions_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string;
          doc_date: string | null;
          doc_type: string;
          embedding: string | null;
          expires_at: string | null;
          file_size_bytes: number;
          id: string;
          metadata: Json;
          mime_type: string;
          original_file_name: string;
          owner_id: string;
          processing_status: string;
          raw_ocr_text: string;
          sender: string;
          storage_path: string;
          summary_text: string;
          title: string;
          topic: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          doc_date?: string | null;
          doc_type?: string;
          embedding?: string | null;
          expires_at?: string | null;
          file_size_bytes: number;
          id?: string;
          metadata?: Json;
          mime_type: string;
          original_file_name: string;
          owner_id: string;
          processing_status?: string;
          raw_ocr_text?: string;
          sender?: string;
          storage_path: string;
          summary_text?: string;
          title: string;
          topic?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          doc_date?: string | null;
          doc_type?: string;
          embedding?: string | null;
          expires_at?: string | null;
          file_size_bytes?: number;
          id?: string;
          metadata?: Json;
          mime_type?: string;
          original_file_name?: string;
          owner_id?: string;
          processing_status?: string;
          raw_ocr_text?: string;
          sender?: string;
          storage_path?: string;
          summary_text?: string;
          title?: string;
          topic?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          pin_failed_attempts: number;
          pin_hash: string | null;
          pin_locked_until: string | null;
          preferred_locale: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          email: string;
          id: string;
          pin_failed_attempts?: number;
          pin_hash?: string | null;
          pin_locked_until?: string | null;
          preferred_locale?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          pin_failed_attempts?: number;
          pin_hash?: string | null;
          pin_locked_until?: string | null;
          preferred_locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vault_items: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          is_secret: boolean;
          label: string;
          owner_id: string;
          source_document_id: string | null;
          updated_at: string;
          username_or_hint: string | null;
          value_encrypted: string | null;
          value_plain: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          is_secret?: boolean;
          label: string;
          owner_id: string;
          source_document_id?: string | null;
          updated_at?: string;
          username_or_hint?: string | null;
          value_encrypted?: string | null;
          value_plain?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          is_secret?: boolean;
          label?: string;
          owner_id?: string;
          source_document_id?: string | null;
          updated_at?: string;
          username_or_hint?: string | null;
          value_encrypted?: string | null;
          value_plain?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vault_items_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vault_items_source_document_id_fkey';
            columns: ['source_document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type DocumentRow = Database['public']['Tables']['documents']['Row'];
export type VaultItemRow = Database['public']['Tables']['vault_items']['Row'];
export type ChatSessionRow = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
