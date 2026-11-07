
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_config": {
                  Row: {
                    "key": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"draws": {
                  Row: {
                    "amount": number,"buyer_id": string | null,"created_at": string | null,"id": string,"listing_id": string | null,"result": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"buyer_id"?: string | null,"created_at"?: string | null,"id"?: string,"listing_id"?: string | null,"result": string
                  }
                  Update: {
                    "amount"?: number,"buyer_id"?: string | null,"created_at"?: string | null,"id"?: string,"listing_id"?: string | null,"result"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "draws_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draws_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_secrets": {
                  Row: {
                    "barcode_number": string | null,"image_path": string,"listing_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "barcode_number"?: string | null,"image_path": string,"listing_id": string
                  }
                  Update: {
                    "barcode_number"?: string | null,"image_path"?: string,"listing_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_secrets_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: true
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "brand": string,"category": string,"created_at": string | null,"expires_on": string,"face_value": number,"id": string,"miss_count": number,"price": number,"probability": number,"product_name": string,"seller_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand": string,"category": string,"created_at"?: string | null,"expires_on": string,"face_value": number,"id"?: string,"miss_count"?: number,"price": number,"probability": number,"product_name": string,"seller_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "brand"?: string,"category"?: string,"created_at"?: string | null,"expires_on"?: string,"face_value"?: number,"id"?: string,"miss_count"?: number,"price"?: number,"probability"?: number,"product_name"?: string,"seller_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string | null,"id": string,"kind": string,"read": boolean,"title": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string | null,"id"?: string,"kind": string,"read"?: boolean,"title": string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string | null,"id"?: string,"kind"?: string,"read"?: boolean,"title"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string | null,"id": string,"nickname": string,"push_token": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id": string,"nickname": string,"push_token"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"nickname"?: string,"push_token"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"settlements": {
                  Row: {
                    "buyer_id": string | null,"created_at": string | null,"draw_id": string | null,"fee": number,"gross": number,"id": string,"net": number,"release_at": string | null,"resolved_at": string | null,"seller_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_id"?: string | null,"created_at"?: string | null,"draw_id"?: string | null,"fee": number,"gross": number,"id"?: string,"net": number,"release_at"?: string | null,"resolved_at"?: string | null,"seller_id"?: string | null,"status": string
                  }
                  Update: {
                    "buyer_id"?: string | null,"created_at"?: string | null,"draw_id"?: string | null,"fee"?: number,"gross"?: number,"id"?: string,"net"?: number,"release_at"?: string | null,"resolved_at"?: string | null,"seller_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settlements_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_draw_id_fkey"
      columns: ["draw_id"]
isOneToOne: true
      referencedRelation: "draws"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wallet_transactions": {
                  Row: {
                    "amount": number,"created_at": string | null,"id": string,"kind": string,"ref_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string | null,"id"?: string,"kind": string,"ref_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string | null,"id"?: string,"kind"?: string,"ref_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wallet_transactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wallets": {
                  Row: {
                    "balance": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "balance"?: number,"user_id": string
                  }
                  Update: {
                    "balance"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wallets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_winner":
{ Args: { "listing": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

export type Listing = Database['public']['Tables']['listings']['Row']
export type ListingSecret = Database['public']['Tables']['listing_secrets']['Row']
export type Draw = Database['public']['Tables']['draws']['Row']
export type Settlement = Database['public']['Tables']['settlements']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type Category = 'cafe' | 'convenience' | 'chicken_pizza' | 'bakery' | 'dining' | 'etc'
export type Probability = 25 | 50 | 75
