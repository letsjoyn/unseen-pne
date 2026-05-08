# Unseen PNE QA Checklist

Use this before every demo, branch merge, or deployment.

## 1. Environment

- Backend starts without import errors.
- Frontend starts without TypeScript errors.
- Seeded schemes, prompts, routing policies, and follow-up policies load successfully.
- If Gemini credentials are missing, fallback orchestration still works.

## 2. Auth

- Login works with the chosen active auth system.
- Protected routes redirect correctly when logged out.
- Logged-in volunteer can access intake, cases, insights.

## 3. Intake

- A new case can be created with minimal beneficiary fields.
- Consent gate blocks submission when unchecked.
- Autosaved draft restores correctly.
- Household dependents can be added, edited, and removed.

## 4. Pipeline

- `Create & run pipeline` creates a case and opens the case details page.
- Pipeline events appear in the audit trail.
- Re-run pipeline button works on an existing case.
- Profile confidence and DER render without crashing.

## 5. Matching + Blockers

- At least one seeded case reaches `matched`.
- Match cards show citations.
- Blocker report renders for the top match.
- Missing-document blockers appear when docs are absent.

## 6. Household Swarms

- Kamala demo case shows a household member in intake.
- Case details show the `Household opportunity graph`.
- Household queue includes a recommended swarm type.
- At least one household opportunity is attached to that member.

## 7. Packet + Routing

- Action packet renders email body, cover letter, and checklist.
- Checklist gate works before approval.
- Approve/send updates the case state.
- Route plan appears after pipeline completion.

## 8. Last-Mile Print Routing

- A high-DER or low-connectivity case produces a `Last-mile print routing` card after printable approval.
- Print routing card shows:
  - reason
  - hub name
  - open hours or address
  - volunteer handoff steps

## 9. Follow-ups + Insights

- Follow-up tasks appear after the pipeline runs.
- Insights page loads summary cards.
- DER and missed-value numbers render for cases with profile data.

## 10. Demo Cases To Rehearse

- `demo_kamala_parallel_swarm`
  Expected: widow support + daughter education swarm + print routing
- `demo_vendor_livelihood`
  Expected: PM SVANidhi style livelihood path
- `demo_farmer_basic_social_protection`
  Expected: agriculture + food security fallback

## 11. Final Judge Sanity Check

- One sentence pitch is memorized.
- One strongest demo case is selected in advance.
- Backup case is ready if a primary scheme does not match.
- Team knows who speaks during:
  - intake
  - AI reasoning
  - packet approval
  - print routing
  - follow-up / impact
