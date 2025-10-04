# Platform · Engine Compatibility

This folder preserves the historic `dynamic_engines` import surface while the
codebase migrates to pillar-focused namespaces. `__init__.py` lazily forwards
legacy engine names to their canonical modules.

When new orchestrators are added elsewhere in the repo, register them in the
`_ENGINE_EXPORTS` mapping so downstream scripts using the old paths continue to
work during the transition.  Call `enable_all_dynamic_engines()` if you need to
eagerly load every export (for example in tooling that validates engine
availability at boot time).
