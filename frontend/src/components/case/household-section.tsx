"use client";

import type { CaseDetail } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { Badge } from "@/components/ui/badge";

export function HouseholdSection({
  householdMembers,
  profile,
}: {
  householdMembers: CaseDetail["household_members"];
  profile: CaseDetail["profile"];
}) {
  const dependencyGraph = profile?.family_dependency_graph || [];
  const opportunityQueue = profile?.household_opportunity_queue || [];

  if (householdMembers.length === 0 && dependencyGraph.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Household opportunity graph"
        description="Shows which dependents can trigger parallel support swarms beyond the primary resident."
      />
      <CardBody className="space-y-5">
        {householdMembers.length > 0 && (
          <div className="space-y-3">
            {householdMembers.map((member, index) => (
              <div
                key={`${member.name || "member"}-${index}`}
                className="rounded border bg-subtle/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight">
                    {member.name || `Household member ${index + 1}`}
                  </span>
                  {member.relation && <Badge>{member.relation}</Badge>}
                  {member.student && <Badge tone="success">student</Badge>}
                  {member.looking_for_work && <Badge tone="warn">job seeking</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {member.age != null && <span>Age {member.age}</span>}
                  {member.occupation && <span>{member.occupation}</span>}
                  {member.education_level && <span>{member.education_level}</span>}
                  {member.monthly_income != null && (
                    <span>Income Rs {member.monthly_income.toLocaleString("en-IN")}</span>
                  )}
                </div>
                {member.goals.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.goals.map((goal) => (
                      <Badge key={goal} tone="neutral">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {dependencyGraph.length > 0 && (
          <div className="rounded border">
            <div className="border-b px-4 py-3 text-xxs uppercase tracking-tight text-muted">
              Family dependency graph
            </div>
            <div className="divide-y">
              {dependencyGraph.map((node, index) => (
                <div
                  key={`${String(node.member_id || "node")}-${index}`}
                  className="flex flex-col gap-1 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-medium text-fg">
                      {String(node.name || node.member_id || `Member ${index + 1}`)}
                    </div>
                    <div className="text-xs text-muted">
                      {String(node.relation || "household member")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(node.tags) &&
                      node.tags.map((tag) => (
                        <Badge key={String(tag)}>{String(tag).replaceAll("_", " ")}</Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {opportunityQueue.length > 0 && (
          <div className="rounded border bg-subtle/20 px-4 py-3">
            <div className="text-xxs uppercase tracking-tight text-muted">
              Parallel swarm recommendations
            </div>
            <div className="mt-3 space-y-2">
              {opportunityQueue.map((item) => (
                <div
                  key={item.member_id}
                  className="flex flex-col gap-1 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <span className="font-medium text-fg">
                      {item.name || item.member_id}
                    </span>
                    {item.relation ? (
                      <span className="text-muted"> · {item.relation}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.goals.map((goal) => (
                      <Badge key={goal} tone="neutral">
                        {goal}
                      </Badge>
                    ))}
                    <Badge tone="success">
                      {item.recommended_swarm.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
