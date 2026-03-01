// Minimal Database type for Supabase client typing
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          role: 'admin' | 'user' | 'manager';
          created_at: string;
        };
      };
    };
  };
}
