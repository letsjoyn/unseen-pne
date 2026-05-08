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

export type HouseholdMember = {
  name: string;
  relation: string;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  education_level?: string | null;
  monthly_income?: number | null;
  student: boolean;
  looking_for_work: boolean;
  goals: string[];
  documents_available: string[];
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

export type PrintRoutingSlip = {
  case_id: string;
  packet_name: string;
  reason: string;
  recommended_hub: {
    name?: string;
    category?: string;
    district?: string;
    state?: string;
    address?: string;
    maps_query?: string;
    open_hours?: string;
  };
  instructions: string[];
  handoff_mode: string;
};

export type EligibilityPulseFlag = {
  at: string;
  new_scheme_ids: string[];
  upgraded_scheme_ids: string[];
  current_open_matches: string[];
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
  household_members: HouseholdMember[];
  missed_value_inr?: number;
  profile: {
    profile: Record<string, unknown>;
    der_score: number | null;
    confidence: number | null;
    missing_fields: string[];
    family_dependency_graph?: Array<Record<string, unknown>>;
    household_opportunity_queue?: Array<{
      member_id: string;
      name?: string | null;
      relation?: string | null;
      goals: string[];
      recommended_swarm: string;
    }>;
    household_swarm_plan?: {
      case_id: string;
      household_benefit_ceiling_inr: number;
      swarms: Array<{
        member_id: string;
        name?: string | null;
        relation?: string | null;
        recommended_swarm: string;
        goals: string[];
        categories: string[];
        estimated_benefit_ceiling_inr: number;
        opportunities: Array<{
          scheme_id: string;
          name?: string | null;
          category?: string | null;
          eligibility: "eligible" | "probable" | "not_eligible";
          score: number;
          confidence: number;
          estimated_annual_value_inr?: number | null;
        }>;
      }>;
    } | null;
  } | null;
  matches: Match[];
  blockers: BlockerReport[];
  packet: Packet | null;
  route_plan: RoutePlan | null;
  print_routing_slip?: PrintRoutingSlip | null;
  eligibility_pulse?: EligibilityPulseFlag | null;
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
  eligibility_pulse_flags?: number;
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
    household_members: HouseholdMember[];
  };
};
