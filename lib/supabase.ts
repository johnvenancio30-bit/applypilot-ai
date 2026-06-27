import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AnalysisResult, Status, TrackerItem } from "./analysis";

export type { User };

export type ApplicationRecord = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  score: number;
  status: Status;
  analysis: AnalysisResult;
  approved_bullets: number[];
  cover_letter_opening: string;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = {
  company: string;
  role: string;
  score: number;
  status: Status;
  analysis: AnalysisResult;
  approved_bullets: number[];
  cover_letter_opening: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

let browserClient: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

export function applicationRecordToTrackerItem(record: ApplicationRecord): TrackerItem {
  return {
    id: record.id,
    company: record.company,
    role: record.role,
    score: record.score,
    status: record.status,
    date: formatRecordDate(record.updated_at),
  };
}

function formatRecordDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
