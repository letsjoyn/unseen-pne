import { IntakeForm } from "@/components/intake-form";
import { PageHeader } from "@/components/ui";

export default function IntakePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Step 1 of pipeline"
        title="New case intake"
        description="Capture the basics. The orchestrator will run Profiler, Hunter, Matcher, Validator, Closer, Router and Watchdog agents in sequence."
      />
      <IntakeForm />
    </div>
  );
}
