export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          nickname: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          nickname?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          nickname?: string | null;
          avatar_url?: string | null;
        };
      };
      exchange_rates: {
        Row: {
          id: string;
          base_currency: string;
          target_currency: string;
          rate: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          base_currency: string;
          target_currency: string;
          rate: number;
          last_updated: string;
        };
        Update: {
          id?: string;
          base_currency?: string;
          target_currency?: string;
          rate?: number;
          last_updated?: string;
        };
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          currency_pair: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          currency_pair: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          currency_pair?: string;
          created_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      wallet_balances: {
        Row: {
          id: string;
          wallet_id: string;
          currency: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          currency: string;
          balance: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          currency?: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          wallet_id: string;
          type: "exchange" | "send" | "receive";
          from_currency: string;
          to_currency: string;
          amount: number;
          rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          type: "exchange" | "send" | "receive";
          from_currency: string;
          to_currency: string;
          amount: number;
          rate: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          type?: "exchange" | "send" | "receive";
          from_currency?: string;
          to_currency?: string;
          amount?: number;
          rate?: number;
          created_at?: string;
        };
      };
    };
  };
}
