import type {
  CaseDetail,
  CaseSummary,
  InsightsSummary,
  IntakePayload,
  PrintRoutingSlip,
} from "./types";
import { authToken } from "./auth";

const API_BASE =
  typeof window !== "undefined" && process.env.NODE_ENV === "production"
    ? "" // Match the vercel.json rewrite to /api
    : process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      "http://localhost:8080";

/** Fallback service token for the rare case where no user is signed in
 *  (e.g. server-side calls or pre-auth health checks). User-driven calls
 *  always carry the JWT issued at /api/auth/login.
 */
const FALLBACK_TOKEN =
  process.env.NEXT_PUBLIC_API_TOKEN || "change-me-in-prod";

function authHeaders(extra?: Record<string, string>): HeadersInit {
  const token = authToken() || FALLBACK_TOKEN;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async createCase(payload: IntakePayload): Promise<CaseSummary> {
    const res = await fetch(`${API_BASE}/api/cases`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return handle<CaseSummary>(res);
  },

  async listCases(): Promise<CaseSummary[]> {
    const res = await fetch(`${API_BASE}/api/cases`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    return handle<CaseSummary[]>(res);
  },

  async getCase(caseId: string): Promise<CaseDetail> {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    return handle<CaseDetail>(res);
  },

  async runFullPipeline(
    caseId: string
  ): Promise<{ status: string; target_scheme?: string }> {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}/run`, {
      method: "POST",
      headers: authHeaders(),
    });
    return handle(res);
  },

  async approveSendPacket(
    caseId: string,
    payload: { approved_by: string; channels: string[] }
  ): Promise<{
    status: string;
    channels: string[];
    print_routing_slip?: PrintRoutingSlip | null;
  }> {
    const res = await fetch(
      `${API_BASE}/api/action-packets/${caseId}/approve-send`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return handle(res);
  },

  async insightsSummary(): Promise<InsightsSummary> {
    const res = await fetch(`${API_BASE}/api/insights/summary`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    return handle<InsightsSummary>(res);
  },

  async listSchemes(): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(`${API_BASE}/api/admin/schemes`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    return handle(res);
  },

  async importSchemes(payload: {
    schemes: Array<Record<string, unknown>>;
  }): Promise<{
    imported: number;
    rejected: number;
    results: Array<{
      row: number;
      scheme_id: string | null;
      status: string;
      message: string;
    }>;
  }> {
    const res = await fetch(`${API_BASE}/api/admin/schemes/import`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async getSampleCases(): Promise<
    Array<{ id: string; title: string; payload: IntakePayload }>
  > {
    const res = await fetch(`${API_BASE}/api/demo/samples`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    return handle(res);
  },
};
