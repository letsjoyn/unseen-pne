"""Google ADK integration layer.

Each ADK agent here is a thin LlmAgent that:
  - loads its instruction text from the prompt_registry,
  - calls a small set of FunctionTools that read/write our SQLAlchemy DB,
  - runs deterministic scoring (rules engine) when the eligibility decision
    needs to be auditable.
"""
