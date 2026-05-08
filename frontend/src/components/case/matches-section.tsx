import type { Match } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { EligibilityBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

export function MatchesSection({ matches }: { matches: Match[] }) {
  const eligible = matches.filter((m) => m.eligibility !== "not_eligible");
  return (
    <Card>
      <CardHeader
        title="Top matches"
        description="Eligibility decided by the JSONLogic rules engine over the scheme registry."
        right={<Badge>{eligible.length} eligible</Badge>}
      />
      <CardBody className="px-0 py-0">
        {eligible.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">No eligible or probable matches.</div>
        ) : (
          <ul className="dotline-y">
            {eligible.slice(0, 6).map((m) => (
              <li key={m.scheme_id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-xs font-semibold tracking-tight">
                    {m.scheme_id}
                  </div>
                  <div className="flex items-center gap-2">
                    <EligibilityBadge value={m.eligibility} />
                    <Badge>score {m.score.toFixed(2)}</Badge>
                    <Badge>conf {m.confidence.toFixed(2)}</Badge>
                  </div>
                </div>
                {m.reason_codes?.length ? (
                  <div className="mt-1.5 line-clamp-1 text-xxs text-muted">
                    {(m.reason_codes || []).slice(0, 6).join(" · ")}
                  </div>
                ) : null}
                {m.citations?.length ? (
                  <div className="mt-2 text-xxs">
                    {m.citations.map((c, i) => (
                      <a
                        key={i}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-3 text-fg underline-offset-2 hover:underline"
                      >
                        source · verified {c.last_verified_at?.slice(0, 10)}
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
