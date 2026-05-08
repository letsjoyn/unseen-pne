"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { IntakePayload } from "@/lib/types";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  Icons,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const DOC_OPTIONS = [
  "aadhaar",
  "ration_card",
  "income_certificate",
  "death_certificate",
  "domicile_proof",
  "bank_passbook",
  "address_proof",
  "caste_certificate",
  "land_record",
  "mcp_card",
];

const STORAGE_KEY = "unseen-pne:intake-draft:v1";
const AUTOSAVE_MS = 30_000;

const empty: IntakePayload = {
  operator_id: "vol_001",
  consent: false,
  notes: "",
  beneficiary: {
    name: "",
    age: undefined,
    gender: "female",
    phone: "",
    email: "",
    is_widow: false,
    location: { state: "Karnataka", district: "Bengaluru Urban", pincode: "" },
    household_size: undefined,
    dependents: undefined,
    monthly_income: undefined,
    occupation: "",
    documents_available: [],
    bank_linked: false,
    smartphone_access: false,
    internet_access: false,
    literacy_level: "low",
    household_members: [],
  },
};

const SAMPLE_KAMALA: IntakePayload = {
  operator_id: "vol_001",
  consent: false,
  notes:
    "Husband passed in 2019. Daughter in Class 9 at govt school. Lives with elderly mother-in-law.",
  beneficiary: {
    name: "Kamala D.",
    age: 58,
    gender: "female",
    phone: "9845012233",
    email: "",
    is_widow: true,
    location: {
      state: "Karnataka",
      district: "Bengaluru Urban",
      pincode: "560066",
    },
    household_size: 3,
    dependents: 2,
    monthly_income: 2200,
    occupation: "domestic worker",
    documents_available: ["aadhaar"],
    bank_linked: false,
    smartphone_access: false,
    internet_access: false,
    literacy_level: "low",
    household_members: [
      {
        name: "Anitha D.",
        relation: "daughter",
        age: 18,
        gender: "female",
        occupation: "student",
        education_level: "class_12",
        monthly_income: 0,
        student: true,
        looking_for_work: false,
        goals: ["college scholarship", "hostel support"],
        documents_available: ["aadhaar", "marks_card"],
      },
    ],
  },
};

function newHouseholdMember(): IntakePayload["beneficiary"]["household_members"][number] {
  return {
    name: "",
    relation: "",
    age: undefined,
    gender: "",
    occupation: "",
    education_level: "",
    monthly_income: undefined,
    student: false,
    looking_for_work: false,
    goals: [],
    documents_available: [],
  };
}

function normalizeDraft(raw: unknown): IntakePayload {
  const parsed = (raw && typeof raw === "object" ? raw : {}) as Partial<IntakePayload>;
  const beneficiary = (parsed.beneficiary || {}) as Partial<IntakePayload["beneficiary"]>;

  return {
    ...empty,
    ...parsed,
    beneficiary: {
      ...empty.beneficiary,
      ...beneficiary,
      location: {
        ...empty.beneficiary.location,
        ...(beneficiary.location || {}),
      },
      documents_available: Array.isArray(beneficiary.documents_available)
        ? beneficiary.documents_available
        : [],
      household_members: Array.isArray(beneficiary.household_members)
        ? beneficiary.household_members
        : [],
    },
  };
}

export function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState<IntakePayload>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const initialLoaded = useRef(false);

  // Restore draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setForm(normalizeDraft(parsed));
          setRestored(true);
        }
      }
    } catch {
      /* ignore */
    } finally {
      initialLoaded.current = true;
    }
  }, []);

  // Auto-save every 30s + on form change (debounced via interval)
  useEffect(() => {
    if (!initialLoaded.current || typeof window === "undefined") return;
    const id = setInterval(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
        setSavedAt(Date.now());
      } catch {
        /* ignore quota */
      }
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [form]);

  function update<K extends string>(path: K, value: unknown) {
    setForm((prev) => {
      const next = structuredClone(prev) as IntakePayload;
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let target: any = next;
      for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
      target[parts[parts.length - 1]] = value;
      return next;
    });
  }

  const householdMembers = form.beneficiary.household_members || [];

  function toggleDoc(doc: string) {
    setForm((prev) => {
      const set = new Set(prev.beneficiary.documents_available);
      set.has(doc) ? set.delete(doc) : set.add(doc);
      return {
        ...prev,
        beneficiary: {
          ...prev.beneficiary,
          documents_available: Array.from(set),
        },
      };
    });
  }

  function loadSample() {
    setForm(SAMPLE_KAMALA);
  }

  function addHouseholdMember() {
    setForm((prev) => ({
      ...prev,
      beneficiary: {
        ...prev.beneficiary,
        household_members: [
          ...prev.beneficiary.household_members,
          newHouseholdMember(),
        ],
      },
    }));
  }

  function removeHouseholdMember(index: number) {
    setForm((prev) => ({
      ...prev,
      beneficiary: {
        ...prev.beneficiary,
        household_members: prev.beneficiary.household_members.filter(
          (_, memberIndex) => memberIndex !== index
        ),
      },
    }));
  }

  function toggleHouseholdGoal(index: number, goal: string) {
    setForm((prev) => {
      const members = structuredClone(prev.beneficiary.household_members);
      const current = new Set(members[index]?.goals || []);
      current.has(goal) ? current.delete(goal) : current.add(goal);
      members[index].goals = Array.from(current);
      return {
        ...prev,
        beneficiary: {
          ...prev.beneficiary,
          household_members: members,
        },
      };
    });
  }

  function clearDraft() {
    setForm(empty);
    setRestored(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createCase(form);
      // Fire-and-forget the synchronous backend run; the case detail page
      // polls events and shows the live AgentProgress UI while it executes.
      api.runFullPipeline(created.case_id).catch(() => {
        /* errors surface via case events */
      });
      // Wipe the draft only after we've successfully created the case
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
      router.push(`/cases/${created.case_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {restored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border bg-subtle/40 px-4 py-2 text-xxs">
          <span className="text-muted">
            <Icons.ClockIcon size={11} className="mr-1.5 inline align-[-2px]" />
            Restored an unsaved draft from this device.
          </span>
          <button
            type="button"
            className="text-fg hover:underline"
            onClick={clearDraft}
          >
            Clear draft
          </button>
        </div>
      )}

      <Card>
        <CardHeader
          title="Beneficiary"
          description="Basic facts. The Profiler agent normalizes this into a structured profile."
          right={
            <Button type="button" variant="ghost" size="sm" onClick={loadSample}>
              Load sample · Kamala D.
            </Button>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.beneficiary.name}
                onChange={(e) => update("beneficiary.name", e.target.value)}
                placeholder="e.g. Kamala D."
                required
              />
            </Field>
            <Field label="Age">
              <Input
                type="number"
                value={form.beneficiary.age ?? ""}
                onChange={(e) =>
                  update(
                    "beneficiary.age",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </Field>
            <Field label="Gender">
              <Select
                value={form.beneficiary.gender}
                onChange={(e) => update("beneficiary.gender", e.target.value)}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Phone">
              <Input
                value={form.beneficiary.phone || ""}
                onChange={(e) => update("beneficiary.phone", e.target.value)}
                placeholder="+91"
              />
            </Field>
            <Field label="Occupation">
              <Input
                value={form.beneficiary.occupation || ""}
                onChange={(e) => update("beneficiary.occupation", e.target.value)}
                placeholder="e.g. domestic worker"
              />
            </Field>
            <Field label="Monthly income (₹)">
              <Input
                type="number"
                value={form.beneficiary.monthly_income ?? ""}
                onChange={(e) =>
                  update(
                    "beneficiary.monthly_income",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </Field>
            <Field label="Household size">
              <Input
                type="number"
                value={form.beneficiary.household_size ?? ""}
                onChange={(e) =>
                  update(
                    "beneficiary.household_size",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </Field>
            <Field label="Dependents">
              <Input
                type="number"
                value={form.beneficiary.dependents ?? ""}
                onChange={(e) =>
                  update(
                    "beneficiary.dependents",
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Location"
          description="Used for state-scoped scheme matching."
        />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="State">
              <Input
                value={form.beneficiary.location.state}
                onChange={(e) =>
                  update("beneficiary.location.state", e.target.value)
                }
                required
              />
            </Field>
            <Field label="District">
              <Input
                value={form.beneficiary.location.district || ""}
                onChange={(e) =>
                  update("beneficiary.location.district", e.target.value)
                }
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={form.beneficiary.location.pincode || ""}
                onChange={(e) =>
                  update("beneficiary.location.pincode", e.target.value)
                }
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Vulnerability + access"
          description="Drives the Digital Exclusion Risk score and prioritization."
        />
        <CardBody className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Checkbox
              label="Widow"
              checked={form.beneficiary.is_widow}
              onChange={(v) => update("beneficiary.is_widow", v)}
            />
            <Checkbox
              label="Bank linked"
              checked={form.beneficiary.bank_linked}
              onChange={(v) => update("beneficiary.bank_linked", v)}
            />
            <Checkbox
              label="Smartphone"
              checked={form.beneficiary.smartphone_access}
              onChange={(v) => update("beneficiary.smartphone_access", v)}
            />
            <Checkbox
              label="Internet access"
              checked={form.beneficiary.internet_access}
              onChange={(v) => update("beneficiary.internet_access", v)}
            />
          </div>

          <div className="max-w-xs">
            <Field label="Literacy">
              <Select
                value={form.beneficiary.literacy_level}
                onChange={(e) =>
                  update("beneficiary.literacy_level", e.target.value)
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>

          <Field
            label="Documents available"
            hint="Toggle the documents the beneficiary already holds."
          >
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DOC_OPTIONS.map((doc) => {
                const active = form.beneficiary.documents_available.includes(
                  doc
                );
                return (
                  <button
                    type="button"
                    key={doc}
                    onClick={() => toggleDoc(doc)}
                    className={cn(
                      "rounded border px-2.5 py-1 text-xxs uppercase tracking-tight transition-colors",
                      active
                        ? "border-fg bg-fg text-bg"
                        : "border-border bg-bg text-muted hover:text-fg hover:bg-subtle"
                    )}
                  >
                    {doc.replaceAll("_", " ")}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Notes" hint="Optional context for the volunteer.">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Household dependents"
          description="Capture other family members so the orchestrator can spawn parallel support hunts."
          right={
            <Button type="button" variant="ghost" size="sm" onClick={addHouseholdMember}>
              Add household member
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {householdMembers.length === 0 ? (
            <div className="rounded border border-dashed px-4 py-4 text-sm text-muted">
              No dependents added yet. Add a daughter, parent, or job-seeking member to unlock parallel opportunity matching.
            </div>
          ) : (
            householdMembers.map((member, index) => (
              <div key={index} className="rounded border bg-subtle/25 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-tight">
                      Household member {index + 1}
                    </div>
                    <div className="text-xxs text-muted">
                      Used to build the family dependency graph and opportunity queue.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHouseholdMember(index)}
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Name">
                    <Input
                      value={member.name}
                      onChange={(e) =>
                        update(
                          `beneficiary.household_members.${index}.name`,
                          e.target.value
                        )
                      }
                      placeholder="e.g. Anitha D."
                    />
                  </Field>
                  <Field label="Relation">
                    <Input
                      value={member.relation}
                      onChange={(e) =>
                        update(
                          `beneficiary.household_members.${index}.relation`,
                          e.target.value
                        )
                      }
                      placeholder="daughter / son / mother-in-law"
                    />
                  </Field>
                  <Field label="Age">
                    <Input
                      type="number"
                      value={member.age ?? ""}
                      onChange={(e) =>
                        update(
                          `beneficiary.household_members.${index}.age`,
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                    />
                  </Field>
                  <Field label="Occupation">
                    <Input
                      value={member.occupation || ""}
                      onChange={(e) =>
                        update(
                          `beneficiary.household_members.${index}.occupation`,
                          e.target.value
                        )
                      }
                      placeholder="student / job seeker / caregiver"
                    />
                  </Field>
                  <Field label="Education level">
                    <Input
                      value={member.education_level || ""}
                      onChange={(e) =>
                        update(
                          `beneficiary.household_members.${index}.education_level`,
                          e.target.value
                        )
                      }
                      placeholder="class_12 / diploma / graduate"
                    />
                  </Field>
                  <Field label="Monthly income (₹)">
                    <Input
                      type="number"
                      value={member.monthly_income ?? ""}
                      onChange={(e) =>
                        update(
                          `beneficiary.household_members.${index}.monthly_income`,
                          e.target.value === "" ? undefined : Number(e.target.value)
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Checkbox
                    label="Currently a student"
                    checked={member.student}
                    onChange={(v) =>
                      update(`beneficiary.household_members.${index}.student`, v)
                    }
                  />
                  <Checkbox
                    label="Looking for work"
                    checked={member.looking_for_work}
                    onChange={(v) =>
                      update(
                        `beneficiary.household_members.${index}.looking_for_work`,
                        v
                      )
                    }
                  />
                </div>

                <Field
                  className="mt-4"
                  label="Goals"
                  hint="These help the AI decide whether to launch scholarship, livelihood, or household support swarms."
                >
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      "college scholarship",
                      "hostel support",
                      "job placement",
                      "skills training",
                      "caregiver support",
                    ].map((goal) => {
                      const active = member.goals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleHouseholdGoal(index, goal)}
                          className={cn(
                            "rounded border px-2.5 py-1 text-xxs uppercase tracking-tight transition-colors",
                            active
                              ? "border-fg bg-fg text-bg"
                              : "border-border bg-bg text-muted hover:text-fg hover:bg-subtle"
                          )}
                        >
                          {goal}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-start gap-3">
          <input
            id="consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => update("consent", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded-sm border border-border bg-bg accent-fg"
          />
          <label htmlFor="consent" className="text-xs text-muted">
            The beneficiary has provided informed consent for their data to be
            processed for the purpose of identifying and applying to support
            schemes. Audit-logged at intake.
          </label>
        </CardBody>
      </Card>

      {error && (
        <div className="rounded border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
          <div className="font-medium">{error}</div>
          <div className="mt-1 text-xxs">
            Try again, or check that the backend is reachable at{" "}
            <span className="font-mono">/api/cases</span>.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          type="submit"
          disabled={!form.consent || submitting}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Icons.Spinner size={12} /> Creating case…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              Create &amp; run pipeline
              <Icons.ArrowRightIcon size={12} />
            </span>
          )}
        </Button>
        <Button
          type="reset"
          variant="ghost"
          onClick={() => {
            setForm(empty);
            clearDraft();
          }}
          disabled={submitting}
        >
          Reset
        </Button>
        {savedAt && (
          <span className="ml-auto text-xxs tabular text-muted">
            <Icons.CheckIcon size={11} className="mr-1 inline align-[-2px]" />
            Draft saved {timeAgo(savedAt)}
          </span>
        )}
      </div>
    </form>
  );
}

function timeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  return `${m}m ago`;
}
