# Unseen PNE Demo Runbook

## Goal

Show that Unseen PNE does more than list schemes:

`intake -> profile -> match -> blockers -> packet -> routing -> follow-up`

The best demo also shows the two standout USP moments:

1. `Parallel household swarms`
2. `Last-mile print routing`

---

## Best Demo Case

Use `demo_kamala_parallel_swarm` from [backend/config/demo_cases.seed.json](/Users/ayush/unseen-pne/backend/config/demo_cases.seed.json:1).

Why this is the best:

- Primary resident is a widow, so core social-protection schemes should match.
- The daughter creates a second household opportunity path for scholarships/hostel support.
- DER should be high, which enables the print-routing story.

---

## Two-Minute Judge Flow

### 1. Start on intake

Open the intake page and either:

- manually enter the Kamala case, or
- copy values from `demo_kamala_parallel_swarm`

Say:

> “This volunteer intake is not just for one resident. The system also captures household dependents so it can maximize the full household benefit ceiling.”

### 2. Submit and run pipeline

Create the case and move to the case page.

Point out:

- profile built
- DER score
- top scheme matches
- blocker report
- packet draft

Say:

> “The rules engine decides eligibility, the validator finds the exact blockers, and the closer prepares a human-approved packet.”

### 3. Show the household opportunity graph

On the case page, open the `Household opportunity graph` section.

Point out:

- the daughter node
- goals like scholarship / hostel support
- recommended swarm type
- attached opportunity suggestions

Say:

> “This is the compound-impact layer. The system doesn’t stop at the widow pension. It sees the dependent daughter and launches a parallel education-support path.”

### 4. Approve printable packet

Approve the packet with `printable only` or `email + printable`.

Then show the `Last-mile print routing` section.

Point out:

- why the print route was triggered
- suggested print hub
- volunteer handoff steps

Say:

> “Because this household has high digital exclusion risk, emailing a PDF is not enough. The system generates a last-mile print handoff instead.”

### 5. Finish on follow-ups and insights

Point out:

- follow-up tasks
- routed status
- DER / missed value on the case
- Nightly Pulse / living eligibility concept

Say:

> “The case does not end at matching. The platform routes, schedules follow-up, and tracks progress to closure.”

Optional live step:

- Trigger `POST /api/admin/eligibility-pulse/run`
- Explain that open cases are re-checked against updated rules and newly eligible residents get flagged automatically

---

## Backup Demo Cases

### `demo_vendor_livelihood`

Use when you want:

- a livelihood story
- lower DER than Kamala
- clean PM SVANidhi explanation

### `demo_farmer_basic_social_protection`

Use when you want:

- broader household support
- food security + PM-KISAN
- a follow-up/routing regression case

---

## Expected Outcomes For Kamala

- Primary schemes should include:
  - `KA-WIDOW-PENSION`
  - `KA-GRUHA-LAKSHMI`
  - `KA-ANNA-BHAGYA`
- Household swarm suggestions should include:
  - `KA-VIDYASIRI`
  - `PRE-MATRIC-SC-ST`
- DER should feel visibly high.
- Packet approval with printable delivery should produce a print routing slip.

---

## Judge One-Liners

- “We are not hardcoding schemes or workflows; everything is config- and policy-driven.”
- “Eligibility is deterministic, citations are preserved, and outbound actions require human approval.”
- “Our AI does not just recommend benefits. It plans execution across the household and the physical last mile.”
