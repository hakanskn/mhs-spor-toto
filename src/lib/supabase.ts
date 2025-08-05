import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type User = {
  id: string;
  name: string;
  unique_access_key: string;
  created_at: string;
  is_active: boolean;
};

export type Week = {
  id: string;
  week_number: number;
  year: number;
  status: 'pending' | 'open_for_predictions' | 'closed';
  created_at: string;
  closed_at: string | null;
};

export type Match = {
  id: string;
  week_id: string;
  match_number: number;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  location: string | null;
  official_result: 1 | 0 | 2 | null;
  match_score: string | null;
  created_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_result: 1 | 0 | 2;
  created_at: string;
  updated_at: string;
};

export type UserScore = {
  id: string;
  user_id: string;
  week_id: string;
  correct_predictions: number;
  total_predictions: number;
  score: number;
  created_at: string;
  updated_at: string;
};

// Extended types for UI
export type MatchWithPredictions = Match & {
  predictions?: Prediction[];
};

export type WeekWithMatches = Week & {
  matches?: Match[];
};

export type UserWithScore = User & {
  scores?: UserScore[];
};