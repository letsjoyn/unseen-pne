"""Declarative rules evaluator (JSONLogic).

Eligibility for any scheme is encoded as a JSONLogic tree stored on
`schemes.eligibility_rules`. The engine returns:

  - decision: "eligible" | "probable" | "not_eligible"
  - matched_rules / failed_rules
  - coverage: fraction of leaf rules that had data to evaluate
  - confidence: coverage * (1 - missing_required_doc_penalty)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

try:
    from json_logic import jsonLogic  # type: ignore
except ImportError:  # pragma: no cover - alt package name
    from json_logic_qubit import jsonLogic  # type: ignore


@dataclass
class RuleEvaluation:
    decision: str
    score: float
    confidence: float
    matched: list[str]
    failed: list[str]
    missing_inputs: list[str]


def _flatten_leaves(rule: Any, path: str = "$") -> list[tuple[str, Any]]:
    """Walk a JSONLogic tree and return leaf comparisons for explanation."""

    if not isinstance(rule, dict):
        return []
    leaves: list[tuple[str, Any]] = []
    for op, args in rule.items():
        if op in {"and", "or", "all", "some", "none"}:
            for i, child in enumerate(args if isinstance(args, list) else [args]):
                leaves.extend(_flatten_leaves(child, f"{path}.{op}[{i}]"))
        else:
            leaves.append((f"{path}.{op}", {op: args}))
    return leaves


def _required_inputs(rule: Any) -> set[str]:
    """Collect every variable referenced via the JSONLogic `var` op."""

    found: set[str] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if "var" in node:
                v = node["var"]
                if isinstance(v, str):
                    found.add(v)
                elif isinstance(v, list) and v and isinstance(v[0], str):
                    found.add(v[0])
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(rule)
    return found


def evaluate(
    rules: dict[str, Any],
    profile: dict[str, Any],
    *,
    required_documents: list[str] | None = None,
    available_documents: list[str] | None = None,
) -> RuleEvaluation:
    required_inputs = _required_inputs(rules)
    missing_inputs = sorted(i for i in required_inputs if _lookup(profile, i) in (None, ""))
    leaves = _flatten_leaves(rules)

    matched: list[str] = []
    failed: list[str] = []

    for label, leaf_rule in leaves:
        try:
            ok = bool(jsonLogic(leaf_rule, profile))
        except Exception:
            ok = False
        (matched if ok else failed).append(label)

    try:
        overall = bool(jsonLogic(rules, profile))
    except Exception:
        overall = False

    coverage = (
        1.0
        if not required_inputs
        else max(0.0, 1.0 - len(missing_inputs) / len(required_inputs))
    )

    doc_penalty = 0.0
    if required_documents:
        avail = set((available_documents or []))
        missing_docs = [d for d in required_documents if d not in avail]
        doc_penalty = 0.4 * (len(missing_docs) / max(1, len(required_documents)))

    confidence = max(0.0, min(1.0, coverage - doc_penalty))

    if overall and missing_inputs:
        decision = "probable"
    elif overall:
        decision = "eligible"
    elif coverage < 0.5:
        decision = "probable"
    else:
        decision = "not_eligible"

    score = 0.6 * (1.0 if overall else 0.0) + 0.3 * coverage + 0.1 * (1 - doc_penalty)

    return RuleEvaluation(
        decision=decision,
        score=round(score, 3),
        confidence=round(confidence, 3),
        matched=matched,
        failed=failed,
        missing_inputs=missing_inputs,
    )


def _lookup(data: dict[str, Any], dotted: str) -> Any:
    cur: Any = data
    for part in dotted.split("."):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur
