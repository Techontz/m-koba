
export type UserRole = 'user' | 'katibu' | 'mweka_hazina' | 'mwenyekiti';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  received_payout?: boolean;
  payout_amount?: number;
  created_at: string;
}

export interface ContributionPeriod {
  id: string;
  year: number;
  created_by: string;
  created_at: string;
}

export type Month = `${number}-${string}`; 
// e.g. "2025-07"

export const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;

export interface Contribution {
  id: string;
  member_id: string;
  period_id: string;
  month: Month;
  amount: number;
  updated_by: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  member_id: string;
  period_id: string;
  amount: number;
  date: string;
  updated_by: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  created_at: string;
}

export interface AppState {
  user: Profile | null;
  loading: boolean;
  enablePayouts: boolean;
}
