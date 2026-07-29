export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          metadata: Json
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          organization_id: string
          revoked_at: string | null
          robot_user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          organization_id: string
          revoked_at?: string | null
          robot_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          robot_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          capital: number | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json
          deleted_at: string | null
          domain: string | null
          id: string
          industry: string | null
          legal_form: string | null
          naf_code: string | null
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          siren: string | null
          siret: string | null
          size: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          capital?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          legal_form?: string | null
          naf_code?: string | null
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          siren?: string | null
          siret?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          capital?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          legal_form?: string | null
          naf_code?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          siren?: string | null
          siret?: string | null
          size?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tags: {
        Row: {
          company_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          created_at: string
          credentials_encrypted: string
          display_name: string | null
          email_address: string
          id: string
          last_sync_at: string | null
          organization_id: string
          provider: Database["public"]["Enums"]["email_provider"]
          status: Database["public"]["Enums"]["email_account_status"]
          sync_error: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted: string
          display_name?: string | null
          email_address: string
          id?: string
          last_sync_at?: string | null
          organization_id: string
          provider: Database["public"]["Enums"]["email_provider"]
          status?: Database["public"]["Enums"]["email_account_status"]
          sync_error?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string
          display_name?: string | null
          email_address?: string
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          provider?: Database["public"]["Enums"]["email_provider"]
          status?: Database["public"]["Enums"]["email_account_status"]
          sync_error?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_channels: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          label: string | null
          organization_id: string
          type: string
          value: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          label?: string | null
          organization_id: string
          type: string
          value: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          label?: string | null
          organization_id?: string
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_channels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_companies: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          role: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_companies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_fields: Json
          deleted_at: string | null
          email: string | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_fields?: Json
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          content_piece_id: string | null
          created_at: string
          deliverable_id: string | null
          document_id: string | null
          external_url: string | null
          id: string
          is_final: boolean
          organization_id: string
          role: Database["public"]["Enums"]["asset_role"]
          updated_at: string
          version_label: string | null
        }
        Insert: {
          content_piece_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          document_id?: string | null
          external_url?: string | null
          id?: string
          is_final?: boolean
          organization_id: string
          role: Database["public"]["Enums"]["asset_role"]
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          content_piece_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          document_id?: string | null
          external_url?: string | null
          id?: string
          is_final?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["asset_role"]
          updated_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_checklist_items: {
        Row: {
          content_piece_id: string
          created_at: string
          done_at: string | null
          id: string
          is_done: boolean
          label: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          content_piece_id: string
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          label: string
          organization_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          content_piece_id?: string
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          label?: string
          organization_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_checklist_items_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_ideas: {
        Row: {
          angle: string | null
          created_at: string
          deleted_at: string | null
          desired_publish_date: string | null
          hook: string | null
          id: string
          notes: string | null
          organization_id: string
          owner_id: string | null
          planned_format: Database["public"]["Enums"]["content_format"] | null
          priority: Database["public"]["Enums"]["task_priority"]
          promise: string | null
          status: Database["public"]["Enums"]["entity_status"]
          target: string | null
          title: string
          updated_at: string
        }
        Insert: {
          angle?: string | null
          created_at?: string
          deleted_at?: string | null
          desired_publish_date?: string | null
          hook?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          owner_id?: string | null
          planned_format?: Database["public"]["Enums"]["content_format"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          promise?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          target?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          angle?: string | null
          created_at?: string
          deleted_at?: string | null
          desired_publish_date?: string | null
          hook?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          owner_id?: string | null
          planned_format?: Database["public"]["Enums"]["content_format"] | null
          priority?: Database["public"]["Enums"]["task_priority"]
          promise?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          target?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pieces: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          deleted_at: string | null
          format: Database["public"]["Enums"]["content_format"]
          id: string
          idea_id: string | null
          is_blocked: boolean
          organization_id: string
          owner_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          published_at: string | null
          published_url: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          target_audience: string | null
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          format: Database["public"]["Enums"]["content_format"]
          id?: string
          idea_id?: string | null
          is_blocked?: boolean
          organization_id: string
          owner_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          deleted_at?: string | null
          format?: Database["public"]["Enums"]["content_format"]
          id?: string
          idea_id?: string | null
          is_blocked?: boolean
          organization_id?: string
          owner_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_pieces_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "content_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_pieces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_scripts: {
        Row: {
          content_piece_id: string
          created_at: string
          cta: string | null
          hook: string | null
          id: string
          intro: string | null
          key_points: string | null
          long_version: string | null
          organization_id: string
          shooting_notes: string | null
          short_version: string | null
          structure: string | null
          updated_at: string
        }
        Insert: {
          content_piece_id: string
          created_at?: string
          cta?: string | null
          hook?: string | null
          id?: string
          intro?: string | null
          key_points?: string | null
          long_version?: string | null
          organization_id: string
          shooting_notes?: string | null
          short_version?: string | null
          structure?: string | null
          updated_at?: string
        }
        Update: {
          content_piece_id?: string
          created_at?: string
          cta?: string | null
          hook?: string | null
          id?: string
          intro?: string | null
          key_points?: string | null
          long_version?: string | null
          organization_id?: string
          shooting_notes?: string | null
          short_version?: string | null
          structure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_scripts_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: true
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          checklist_items: Json
          created_at: string
          default_priority: Database["public"]["Enums"]["task_priority"]
          deleted_at: string | null
          deliverable_specs: Json
          description: string | null
          format: Database["public"]["Enums"]["content_format"]
          id: string
          is_active: boolean
          name: string
          organization_id: string
          script_skeleton: Json | null
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          checklist_items?: Json
          created_at?: string
          default_priority?: Database["public"]["Enums"]["task_priority"]
          deleted_at?: string | null
          deliverable_specs?: Json
          description?: string | null
          format: Database["public"]["Enums"]["content_format"]
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          script_skeleton?: Json | null
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          checklist_items?: Json
          created_at?: string
          default_priority?: Database["public"]["Enums"]["task_priority"]
          deleted_at?: string | null
          deliverable_specs?: Json
          description?: string | null
          format?: Database["public"]["Enums"]["content_format"]
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          script_skeleton?: Json | null
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_contacts: {
        Row: {
          contact_id: string
          created_at: string
          deal_id: string
          id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          deal_id: string
          id?: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tags: {
        Row: {
          deal_id: string
          tag_id: string
        }
        Insert: {
          deal_id: string
          tag_id: string
        }
        Update: {
          deal_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tags_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          assigned_to: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          custom_fields: Json
          deal_status: Database["public"]["Enums"]["deal_status"]
          deleted_at: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          name: string
          organization_id: string
          position: number
          probability: number | null
          stage: string
          updated_at: string
          weighted_amount: number | null
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          custom_fields?: Json
          deal_status?: Database["public"]["Enums"]["deal_status"]
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          organization_id: string
          position?: number
          probability?: number | null
          stage?: string
          updated_at?: string
          weighted_amount?: number | null
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          custom_fields?: Json
          deal_status?: Database["public"]["Enums"]["deal_status"]
          deleted_at?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          organization_id?: string
          position?: number
          probability?: number | null
          stage?: string
          updated_at?: string
          weighted_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          channel: Database["public"]["Enums"]["publication_channel"] | null
          content_piece_id: string
          created_at: string
          deleted_at: string | null
          format: Database["public"]["Enums"]["content_format"]
          id: string
          organization_id: string
          owner_id: string | null
          position: number
          published_at: string | null
          published_url: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["deliverable_status"]
          title: string
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["publication_channel"] | null
          content_piece_id: string
          created_at?: string
          deleted_at?: string | null
          format: Database["public"]["Enums"]["content_format"]
          id?: string
          organization_id: string
          owner_id?: string | null
          position?: number
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["deliverable_status"]
          title: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["publication_channel"] | null
          content_piece_id?: string
          created_at?: string
          deleted_at?: string | null
          format?: Database["public"]["Enums"]["content_format"]
          id?: string
          organization_id?: string
          owner_id?: string | null
          position?: number
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["deliverable_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_content_piece_id_fkey"
            columns: ["content_piece_id"]
            isOneToOne: false
            referencedRelation: "content_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          mime_type: string
          name: string
          organization_id: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          mime_type: string
          name: string
          organization_id: string
          size_bytes: number
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          mime_type?: string
          name?: string
          organization_id?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_channels: {
        Row: {
          connected_account_id: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          organization_id: string
          sync_cursor: string | null
          sync_mode: string
          updated_at: string
        }
        Insert: {
          connected_account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id: string
          sync_cursor?: string | null
          sync_mode?: string
          updated_at?: string
        }
        Update: {
          connected_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id?: string
          sync_cursor?: string | null
          sync_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_channels_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_participants: {
        Row: {
          contact_id: string | null
          created_at: string
          display_name: string | null
          email_address: string
          email_id: string
          id: string
          role: Database["public"]["Enums"]["email_participant_role"]
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          display_name?: string | null
          email_address: string
          email_id: string
          id?: string
          role: Database["public"]["Enums"]["email_participant_role"]
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          display_name?: string | null
          email_address?: string
          email_id?: string
          id?: string
          role?: Database["public"]["Enums"]["email_participant_role"]
        }
        Relationships: [
          {
            foreignKeyName: "email_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_participants_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body_html: string | null
          body_text: string | null
          channel_id: string
          created_at: string
          direction: Database["public"]["Enums"]["email_direction"]
          folder: string
          has_attachments: boolean
          headers: Json | null
          id: string
          in_reply_to: string | null
          is_read: boolean
          message_id: string
          organization_id: string
          received_at: string
          snippet: string | null
          subject: string | null
          thread_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          channel_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["email_direction"]
          folder?: string
          has_attachments?: boolean
          headers?: Json | null
          id?: string
          in_reply_to?: string | null
          is_read?: boolean
          message_id: string
          organization_id: string
          received_at: string
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          channel_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["email_direction"]
          folder?: string
          has_attachments?: boolean
          headers?: Json | null
          id?: string
          in_reply_to?: string | null
          is_read?: boolean
          message_id?: string
          organization_id?: string
          received_at?: string
          snippet?: string | null
          subject?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "email_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          id: string
          invoice_id: string
          line_total_ht: number
          line_total_tax: number
          line_total_ttc: number
          position: number
          product_id: string | null
          quantity: number
          unit: string | null
          unit_price: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          invoice_id: string
          line_total_ht?: number
          line_total_tax?: number
          line_total_ttc?: number
          position?: number
          product_id?: string | null
          quantity?: number
          unit?: string | null
          unit_price: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          invoice_id?: string
          line_total_ht?: number
          line_total_tax?: number
          line_total_ttc?: number
          position?: number
          product_id?: string | null
          quantity?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          last_number: number
          organization_id: string
          year: number
        }
        Insert: {
          last_number?: number
          organization_id: string
          year: number
        }
        Update: {
          last_number?: number
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          credit_note_for: string | null
          deal_id: string | null
          deleted_at: string | null
          due_date: string | null
          id: string
          is_credit_note: boolean
          issued_at: string | null
          notes: string | null
          organization_id: string
          paid_amount: number
          paid_at: string | null
          reference: string | null
          sent_at: string | null
          source_quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subject: string
          total_ht: number
          total_tax: number
          total_ttc: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_for?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          is_credit_note?: boolean
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          paid_amount?: number
          paid_at?: string | null
          reference?: string | null
          sent_at?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subject: string
          total_ht?: number
          total_tax?: number
          total_ttc?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_note_for?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          is_credit_note?: boolean
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          paid_at?: string | null
          reference?: string | null
          sent_at?: string | null
          source_quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subject?: string
          total_ht?: number
          total_tax?: number
          total_ttc?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_credit_note_for_fkey"
            columns: ["credit_note_for"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date: string
          payment_method?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          reference: string | null
          status: Database["public"]["Enums"]["entity_status"]
          unit: string | null
          unit_price: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          unit?: string | null
          unit_price: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          unit?: string | null
          unit_price?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          id: string
          line_total_ht: number
          line_total_tax: number
          line_total_ttc: number
          position: number
          product_id: string | null
          quantity: number
          quote_id: string
          unit: string | null
          unit_price: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          line_total_ht?: number
          line_total_tax?: number
          line_total_ttc?: number
          position?: number
          product_id?: string | null
          quantity?: number
          quote_id: string
          unit?: string | null
          unit_price: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          line_total_ht?: number
          line_total_tax?: number
          line_total_ttc?: number
          position?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_sequences: {
        Row: {
          current_number: number
          id: string
          organization_id: string
          year: number
        }
        Insert: {
          current_number?: number
          id?: string
          organization_id: string
          year?: number
        }
        Update: {
          current_number?: number
          id?: string
          organization_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          id: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          parent_quote_id: string | null
          reference: string | null
          refused_at: string | null
          refused_reason: string | null
          sent_at: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subject: string
          total_ht: number
          total_tax: number
          total_ttc: number
          updated_at: string
          validity_days: number
          version: number
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          parent_quote_id?: string | null
          reference?: string | null
          refused_at?: string | null
          refused_reason?: string | null
          sent_at?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subject: string
          total_ht?: number
          total_tax?: number
          total_ttc?: number
          updated_at?: string
          validity_days?: number
          version?: number
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          parent_quote_id?: string | null
          reference?: string | null
          refused_at?: string | null
          refused_reason?: string | null
          sent_at?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subject?: string
          total_ht?: number
          total_tax?: number
          total_ttc?: number
          updated_at?: string
          validity_days?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_config: {
        Row: {
          config: Json
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_content_template: {
        Args: {
          p_scheduled_date?: string
          p_template_id: string
          p_title: string
        }
        Returns: string
      }
      cancel_invoice_with_credit_note: {
        Args: { p_invoice_id: string; p_org_id: string }
        Returns: string
      }
      convert_quote_to_invoice: {
        Args: {
          p_due_date: string
          p_org_id: string
          p_quote_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_quote_with_lines: {
        Args: {
          p_company_id?: string
          p_contact_id: string
          p_lines: Json
          p_notes?: string
          p_org_id: string
          p_subject: string
          p_user_id: string
          p_validate: boolean
          p_validity_days: number
        }
        Returns: string
      }
      generate_invoice_reference: {
        Args: { p_org_id: string }
        Returns: string
      }
      generate_quote_reference: { Args: { p_org_id: string }; Returns: string }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      merge_contacts: {
        Args: {
          p_field_overrides?: Json
          p_loser_id: string
          p_org_id: string
          p_winner_id: string
        }
        Returns: string
      }
      resolve_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          id: string
          organization_id: string
          robot_user_id: string
        }[]
      }
      restore_soft_deleted: {
        Args: { p_id: string; p_org_id: string; p_table: string }
        Returns: undefined
      }
      soft_delete: {
        Args: { p_id: string; p_org_id: string; p_table: string }
        Returns: undefined
      }
      touch_api_key_usage: { Args: { p_key_hash: string }; Returns: undefined }
    }
    Enums: {
      asset_role:
        | "thumbnail"
        | "raw_video"
        | "final_video"
        | "short_clip"
        | "audio"
        | "transcript"
        | "script_doc"
        | "brand_asset"
        | "reference"
      content_format:
        | "youtube_long"
        | "youtube_short"
        | "skool_post"
        | "newsletter"
        | "linkedin_post"
        | "podcast"
        | "course_lesson"
        | "blog_article"
        | "case_study"
        | "other"
      content_status:
        | "idea"
        | "research"
        | "script"
        | "recording"
        | "editing"
        | "review"
        | "scheduled"
        | "published"
        | "archived"
      deal_status: "open" | "won" | "lost"
      deliverable_status:
        | "planned"
        | "draft"
        | "ready"
        | "scheduled"
        | "published"
        | "cancelled"
      email_account_status: "connected" | "disconnected" | "error"
      email_direction: "inbound" | "outbound"
      email_participant_role: "from" | "to" | "cc" | "bcc"
      email_provider: "gmail" | "microsoft" | "imap_smtp"
      entity_status: "active" | "archived"
      entity_type:
        | "contact"
        | "company"
        | "deal"
        | "quote"
        | "invoice"
        | "product"
        | "task"
        | "email"
        | "content_idea"
        | "content_piece"
        | "deliverable"
        | "content_template"
      invoice_status:
        | "draft"
        | "validated"
        | "sent"
        | "paid"
        | "partial"
        | "overdue"
        | "cancelled"
      member_role: "admin" | "member" | "viewer"
      publication_channel:
        | "youtube"
        | "skool"
        | "linkedin"
        | "newsletter"
        | "instagram"
        | "tiktok"
        | "x_twitter"
        | "podcast"
        | "blog"
        | "other"
      quote_status:
        | "draft"
        | "validated"
        | "sent"
        | "signed"
        | "refused"
        | "cancelled"
        | "invoiced"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_role: [
        "thumbnail",
        "raw_video",
        "final_video",
        "short_clip",
        "audio",
        "transcript",
        "script_doc",
        "brand_asset",
        "reference",
      ],
      content_format: [
        "youtube_long",
        "youtube_short",
        "skool_post",
        "newsletter",
        "linkedin_post",
        "podcast",
        "course_lesson",
        "blog_article",
        "case_study",
        "other",
      ],
      content_status: [
        "idea",
        "research",
        "script",
        "recording",
        "editing",
        "review",
        "scheduled",
        "published",
        "archived",
      ],
      deal_status: ["open", "won", "lost"],
      deliverable_status: [
        "planned",
        "draft",
        "ready",
        "scheduled",
        "published",
        "cancelled",
      ],
      email_account_status: ["connected", "disconnected", "error"],
      email_direction: ["inbound", "outbound"],
      email_participant_role: ["from", "to", "cc", "bcc"],
      email_provider: ["gmail", "microsoft", "imap_smtp"],
      entity_status: ["active", "archived"],
      entity_type: [
        "contact",
        "company",
        "deal",
        "quote",
        "invoice",
        "product",
        "task",
        "email",
        "content_idea",
        "content_piece",
        "deliverable",
        "content_template",
      ],
      invoice_status: [
        "draft",
        "validated",
        "sent",
        "paid",
        "partial",
        "overdue",
        "cancelled",
      ],
      member_role: ["admin", "member", "viewer"],
      publication_channel: [
        "youtube",
        "skool",
        "linkedin",
        "newsletter",
        "instagram",
        "tiktok",
        "x_twitter",
        "podcast",
        "blog",
        "other",
      ],
      quote_status: [
        "draft",
        "validated",
        "sent",
        "signed",
        "refused",
        "cancelled",
        "invoiced",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
    },
  },
} as const

