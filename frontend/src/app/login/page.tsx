"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_LANDING,
  useAuth,
  type Role,
} from "@/lib/auth";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Icons,
  Input,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const ROLES: Role[] = ["volunteer", "ngo_admin", "beneficiary", "reviewer"];

const PRESETS: Record<Role, { user_id: string; name: string; org: string; case_id?: string }> = {
  volunteer: {
    user_id: "vol_001",
    name: "Asha M.",
    org: "Hasiru Karnataka NGO",
  },
  ngo_admin: {
    user_id: "admin_001",
    name: "Ravi Kumar",
    org: "Hasiru Karnataka NGO",
  },
  beneficiary: {
    user_id: "ben_001",
    name: "Kamala D.",
    org: "Whitefield ward 110",
  },
  reviewer: {
    user_id: "rev_001",
    name: "Dr. Meera S.",
    org: "Karnataka State Policy Review",
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { signIn, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [role, setRole] = useState<Role>("volunteer");
  const [name, setName] = useState(PRESETS["volunteer"].name);
  const [userId, setUserId] = useState(PRESETS["volunteer"].user_id);
  const [org, setOrg] = useState(PRESETS["volunteer"].org);

  function pickRole(r: Role) {
    setRole(r);
    setName(PRESETS[r].name);
    setUserId(PRESETS[r].user_id);
    setOrg(PRESETS[r].org);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = signIn({
      user_id: userId.trim() || PRESETS[role].user_id,
      name: name.trim() || PRESETS[role].name,
      org: org.trim() || PRESETS[role].org,
      role,
      case_id: role === "beneficiary" ? PRESETS[role].case_id : undefined,
    });
    const dest = next && next.startsWith("/") && next !== "/login" ? next : ROLE_LANDING[s.role];
    router.replace(dest);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 py-6">
      {/* Hero */}
      <div className="space-y-1">
        <div className="text-xxs uppercase tracking-tight text-muted">
          Sign in · demo mode
        </div>
        <h1 className="text-3xl font-semibold tracking-tighter md:text-4xl">
          Welcome back to Unseen PNE
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Pick a role to enter the right dashboard. Your session is stored
          locally in this browser — swap this page for Firebase Auth or Clerk
          in production. {session ? "(You're already signed in.)" : ""}
        </p>
      </div>

      {/* Role picker */}
      <div className="grid gap-3 md:grid-cols-2">
        {ROLES.map((r) => {
          const selected = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => pickRole(r)}
              className={cn(
                "group flex flex-col gap-1 rounded border p-4 text-left transition-colors",
                selected
                  ? "border-fg bg-subtle"
                  : "border-border bg-bg hover:bg-subtle/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold tracking-tight">
                  {ROLE_LABELS[r]}
                </span>
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    selected
                      ? "border-fg bg-fg text-bg"
                      : "border-border bg-bg"
                  )}
                >
                  {selected && <Icons.CheckIcon size={10} />}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {ROLE_DESCRIPTIONS[r]}
              </p>
              <div className="pt-1 font-mono text-xxs uppercase tracking-tight text-muted">
                lands on {ROLE_LANDING[r]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Identity card */}
      <Card>
        <CardHeader
          title="Sign in as"
          description="Pre-filled with a demo identity for the selected role. You can edit any field."
          right={
            <span className="text-xxs uppercase tracking-tight text-muted">
              role · {role.replaceAll("_", " ")}
            </span>
          }
        />
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Display name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </Field>
              <Field label="User ID">
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="vol_001"
                />
              </Field>
              <Field label="Organisation / ward">
                <Input
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="Org name"
                />
              </Field>
              <Field label="Role" hint="Drives nav, dashboards and access.">
                <Select
                  value={role}
                  onChange={(e) => pickRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button variant="primary" type="submit">
                <span className="inline-flex items-center gap-1.5">
                  Continue as {ROLE_LABELS[role]}
                  <Icons.ArrowRightIcon size={12} />
                </span>
              </Button>
              <span className="text-xxs text-muted">
                You will be sent to{" "}
                <span className="font-mono">{ROLE_LANDING[role]}</span>
              </span>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
