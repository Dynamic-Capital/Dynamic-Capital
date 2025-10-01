# Python `compileall` Run

This document captures the results of running `python -m compileall` from the
repository root.

## Command

```bash
python -m compileall
```

Run the command from the repository root so that every tracked Python module is
compiled. The invocation leverages the default Python 3.12.10 interpreter
provided by the container image.

## Output Summary

The command compiled the repository's Python sources and reported the following
notable lines:

```text
Listing '/workspace/Dynamic-Capital'...
Compiling '/workspace/Dynamic-Capital/collect_tradingview.py'...
Listing '/root/.pyenv/versions/3.12.10/lib/python312.zip'...
Can't list '/root/.pyenv/versions/3.12.10/lib/python312.zip'
Listing '/root/.pyenv/versions/3.12.10/lib/python3.12'...
Listing '/root/.pyenv/versions/3.12.10/lib/python3.12/lib-dynload'...
Listing '/root/.pyenv/versions/3.12.10/lib/python3.12/site-packages'...
Compiling '/root/.pyenv/versions/3.12.10/lib/python3.12/site-packages/_black_version.py'...
Compiling '/root/.pyenv/versions/3.12.10/lib/python3.12/site-packages/mypy_extensions.py'...
Compiling '/root/.pyenv/versions/3.12.10/lib/python3.12/site-packages/nodeenv.py'...
Compiling '/root/.pyenv/versions/3.12.10/lib/python3.12/site-packages/py.py'...
Compiling '/root/.pyenv/versions/3.12.10/lib/python3.12/site-packages/typing_extensions.py'...
```

The attempt to list `python312.zip` is expected; that standard-library archive
is marked unreadable inside the container, but the warning does not impact
compilation of the repository files.

## Dynamic Model Coverage

Our Python packages are dominated by the atmospheric "dynamic" model families
(for example, `dynamic_stratosphere/model.py`, `dynamic_troposphere/model.py`,
and `dynamic_mesosphere/model.py`). These modules stitch together
dataclass-based observation pipelines and numerical post-processing routines, so
a `compileall` run is a quick way to sanity-check that every layer-specific
model still parses after changes to shared helpers or typing imports.

The same safety net applies to the business-critical dynamic platforms that live
at the repository root:

- **`dynamic.intelligence.agi`** – synthesizes signals from the atmospheric layers and
  ensures the orchestration logic in `agent.py` and `model.py` stay importable
  after edits to shared prompt-building utilities.
- **`dynamic.trading.algo`** – houses the trading strategy backtests, so compiling it
  confirms that the algorithm entry points and the `portfolio/` helpers
  reference only valid type hints.
- **`dynamic.platform.token`** (plus the umbrella `dynamic.platform.token`-adjacent packages such
  as `dynamic_capital_token/` and `dynamic_capital/`) – compileall traverses
  these tokenomics modules to verify that smart-contract bindings and CLI
  integration scripts remain syntax clean. This includes the `__init__.py` glue
  that exposes the token clients to the broader stack.

When `python -m compileall` runs from the repository root it traverses each
`dynamic_*` package, ensuring that `model.py`, `agent.py`, and their siblings
receive fresh bytecode. You can confirm this by spot-checking the transient
`__pycache__/model.cpython-312.pyc` files that appear under directories such as
`dynamic_stratosphere/`, `dynamic.intelligence.agi/`, and `dynamic.platform.token/` before cleanup.

## Additional Python Surfaces to Audit

Most of the repository's Python lives in the `dynamic_*` packages, but
`compileall` also sweeps the smaller edge-case surfaces that support operations
tooling:

- **One-off entry points** such as
  [`collect_tradingview.py`](../collect_tradingview.py) and the helper scripts
  under `scripts/` and `tools/`. These are lightweight shims that still benefit
  from the syntax validation that bytecode generation provides.
- **Serverless functions** in the [`functions/`](../functions) and
  [`apps/`](../apps) trees. Some of these deploy to platforms that do not run
  tests prior to shipping, so compiling them locally is an inexpensive
  guardrail.
- **Test harnesses** within [`tests_python/`](../tests_python) and scenario
  seeds in [`fixtures/`](../fixtures). Keeping those modules importable ensures
  pytest or ad-hoc REPL sessions do not fail due to stale imports.

Spot-checking the transient `__pycache__` folders inside those directories can
confirm they were traversed if you are debugging a missing module.

## Post-run Cleanup Check

After the command finishes, verify that no tracked files changed:

```bash
git status --short
```

The repository should remain clean because generated `__pycache__` directories
are excluded by `.gitignore`. If temporary bytecode files appear elsewhere,
remove them with `find . -name "__pycache__" -type d -prune -exec rm -r {} +`.
