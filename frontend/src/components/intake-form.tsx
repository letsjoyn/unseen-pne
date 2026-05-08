"use client";

import { useState } from "react";
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
  },
};

export function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState<IntakePayload>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function toggleDoc(doc: string) {
    setForm((prev) => {
      const set = new Set(prev.beneficiary.documents_available);
      set.has(doc) ? set.delete(doc) : set.add(doc);
      return {
        ...prev,
        beneficiary: { ...prev.beneficiary, documents_available: Array.from(set) },
      };
    });
  }

  function loadSample() {
    setForm({
      operator_id: "vol_001",
      consent: false,
      notes: "",
      beneficiary: {
        name: "Anita Devi",
        age: 47,
        gender: "female",
        phone: "9876543210",
        email: "",
        is_widow: true,
        location: { state: "Karnataka", district: "Bengaluru Urban", pincode: "560001" },
        household_size: 4,
        dependents: 2,
        monthly_income: 7000,
        occupation: "domestic worker",
        documents_available: ["aadhaar", "ration_card", "bank_passbook"],
        bank_linked: false,
        smartphone_access: false,
        internet_access: false,
        literacy_level: "low",
      },
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createCase(form);
      await api.runFullPipeline(created.case_id);
      router.push(`/cases/${created.case_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader
          title="Beneficiary"
          description="Basic facts. The Profiler agent normalizes this into a structured profile."
          right={
            <Button type="button" variant="ghost" size="sm" onClick={loadSample}>
              Load sample
            </Button>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.beneficiary.name}
                onChange={(e) => update("beneficiary.name", e.target.value)}
                placeholder="e.g. Anita Devi"
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
        <CardHeader title="Location" description="Used for state-scoped scheme matching." />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="State">
              <Input
                value={form.beneficiary.location.state}
                onChange={(e) => update("beneficiary.location.state", e.target.value)}
                required
              />
            </Field>
            <Field label="District">
              <Input
                value={form.beneficiary.location.district || ""}
                onChange={(e) => update("beneficiary.location.district", e.target.value)}
              />
            </Field>
            <Field label="Pincode">
              <Input
                value={form.beneficiary.location.pincode || ""}
                onChange={(e) => update("beneficiary.location.pincode", e.target.value)}
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
                onChange={(e) => update("beneficiary.literacy_level", e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>

          <Field label="Documents available" hint="Toggle the documents the beneficiary already holds.">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DOC_OPTIONS.map((doc) => {
                const active = form.beneficiary.documents_available.includes(doc);
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
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" type="submit" disabled={!form.consent || submitting}>
          {submitting ? "Running pipeline…" : "Create + run pipeline"}
        </Button>
        <Button type="reset" variant="ghost" onClick={() => setForm(empty)} disabled={submitting}>
          Reset
        </Button>
      </div>
    </form>
  );
}
