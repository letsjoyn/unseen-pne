export type CaseSummary = {
  case_id: string;
  status: string;
  operator_id: string;
  created_at: string;
  updated_at: string;
  beneficiary_name?: string | null;
  district?: string | null;
  der_score?: number | null;
  eligible_count?: number;
  total_matches?: number;
  missed_value_inr?: number;
};

export type Citation = {
  url: string;
  clause: string | null;
  last_verified_at: string | null;
};

export type Match = {
  scheme_id: string;
  scheme_name?: string | null;
  scheme_category?: string | null;
  scheme_summary?: string | null;
  estimated_annual_value_inr?: number | null;
  required_documents?: string[];
  eligibility: "eligible" | "probable" | "not_eligible";
  score: number;
  confidence: number;
  urgency: "low" | "medium" | "high";
  reason_codes: string[];
  citations: Citation[];
};

export type Blocker = {
  type: string;
  field?: string;
  severity?: "low" | "medium" | "high";
  description?: string;
  required_items?: string[];
  next_steps: string[];
  office?: {
    name?: string;
    address?: string;
    distance_km?: number;
  };
};

export type BlockerReport = {
  scheme_id: string;
  scheme_name?: string | null;
  blockers: Blocker[];
  minimum_path: string[];
  resolved: boolean;
};

export type Packet = {
  scheme_id: string;
  scheme_name?: string | null;
  cover_letter: string;
  email_subject: string;
  email_body: string;
  whatsapp_summary: string | null;
  checklist: string[];
  approved: boolean;
  sent: boolean;
  sent_channels: string[];
};

export type RoutePlan = {
  primary: Record<string, unknown>;
  fallback: Record<string, unknown> | null;
  scores: Record<string, number>;
};

export type Followup = {
  id: number;
  due_at: string;
  type: string;
  status: string;
  notes: string | null;
};

export type CaseEvent = {
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  at: string;
};

export type CaseDetail = {
  case: {
    id: string;
    status: string;
    operator_id: string;
    created_at: string;
    updated_at: string;
    intake: Record<string, unknown>;
    beneficiary_name?: string | null;
    district?: string | null;
  };
  missed_value_inr?: number;
  profile: {
    profile: Record<string, unknown>;
    der_score: number | null;
    confidence: number | null;
    missing_fields: string[];
  } | null;
  matches: Match[];
  blockers: BlockerReport[];
  packet: Packet | null;
  route_plan: RoutePlan | null;
  followups: Followup[];
  events: CaseEvent[];
};

export type InsightsSummary = {
  as_of: string;
  total_cases: number;
  by_status: Record<string, number>;
  high_der_cases: number;
  estimated_missed_value_inr: number;
  eligible_match_count: number;
  approved_packets: number;
  sent_packets: number;
  pending_followups: number;
  by_category?: Record<string, number>;
};

export type IntakePayload = {
  operator_id: string;
  consent: boolean;
  notes?: string;
  beneficiary: {
    name: string;
    age?: number;
    gender?: string;
    phone?: string;
    email?: string;
    is_widow: boolean;
    location: { state: string; district?: string; pincode?: string };
    household_size?: number;
    dependents?: number;
    monthly_income?: number;
    occupation?: string;
    documents_available: string[];
    bank_linked: boolean;
    smartphone_access: boolean;
    internet_access: boolean;
    literacy_level?: string;
  };
};
