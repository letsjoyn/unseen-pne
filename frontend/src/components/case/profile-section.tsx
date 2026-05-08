import type { CaseDetail } from "@/lib/types";
import { Card, CardBody, CardHeader, KV } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatPct } from "@/lib/format";

export function ProfileSection({ profile }: { profile: CaseDetail["profile"] }) {
  if (!profile) return null;

  const tags =
    (profile.profile as { vulnerability_tags?: string[] })?.vulnerability_tags ?? [];
  const der = profile.der_score ?? 0;
  const derTone = der >= 0.6 ? "danger" : der >= 0.3 ? "warn" : "success";

  return (
    <Card>
      <CardHeader title="Profile" description="Structured by the Profiler agent." />
      <CardBody>
        <div className="grid gap-6 md:grid-cols-3">
          <KV
            label="DER score"
            value={
              <span>
                <span className="text-base">{formatPct(profile.der_score)}</span>
                <Badge tone={derTone} className="ml-2">
                  {der >= 0.6 ? "high" : der >= 0.3 ? "medium" : "low"}
                </Badge>
              </span>
            }
          />
          <KV label="Profile confidence" value={formatPct(profile.confidence)} />
          <KV
            label="Missing fields"
            value={
              profile.missing_fields.length === 0
                ? "—"
                : profile.missing_fields.join(", ")
            }
          />
        </div>

        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t}>{t.replaceAll("_", " ")}</Badge>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
