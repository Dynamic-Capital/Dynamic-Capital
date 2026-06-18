# Dynamic AGI local setup

This guide explains how to run the Dynamic AGI orchestrator and its local machine planner from a workstation environment. Follow these steps to provision a Python environment, expose the repository packages on your `PYTHONPATH`, and exercise the local task bridge that converts improvement plans into executable automation tasks.

## Prerequisites

- Python 3.11 or later
- Git
- (Optional) Docker for containerising downstream workloads that the automation tasks might call

## 1. Clone the repository and create a virtual environment

```bash
git clone https://github.com/your-org/Dynamic-Capital.git
cd Dynamic-Capital
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

## 2. Install Python dependencies

The Dynamic AGI modules depend on other packages that live inside this repository such as `dynamic_ai`, `dynamic_local_machine`, and `dynamic_metadata`. When you run scripts from the repository root, Python automatically discovers these modules because the project is laid out as a package tree. If you plan to run code from another directory, add the repository path to `PYTHONPATH` before executing scripts:

```bash
export PYTHONPATH="$(pwd):${PYTHONPATH}"
```

If additional third-party libraries are required for your experiments, install them into the virtual environment with `python -m pip install <package>`.

## 3. Configure local machine execution defaults

`AGILocalMachineTaskConfig` controls how improvement plan actions and roadmap steps turn into local automation tasks. You can override the working directory, default command, resource estimates, or provide per-action command templates to tailor the generated tasks to your workstation tooling.【F:dynamic_agi/local_machine.py†L52-L117】

Example configuration snippet:

```python
from dynamic_agi.local_machine import AGILocalMachineTaskConfig

config = AGILocalMachineTaskConfig(
    working_directory="/path/to/project",
    default_command=("echo", "{description}"),
    action_commands={
        "install dependencies": ("npm", "install"),
        "run tests": ("npm", "test"),
    },
    environment={"PYTHONPATH": "/path/to/project"},
)
```

## 4. Materialise improvement plans into executable tasks

Use `build_local_machine_plan_from_improvement` to convert an improvement plan (for example, JSON produced by the AGI self-improvement loop) into a `LocalMachinePlan`. The helper normalises actions and roadmap entries, builds task objects, and returns an ordered plan with dependency tracking and resource warnings.【F:dynamic_agi/local_machine.py†L119-L206】

```python
from dynamic_agi.local_machine import (
    AGILocalMachineTaskConfig,
    build_local_machine_plan_from_improvement,
)

sample_improvement = {
    "actions": [
        "Install dependencies",
        "Run tests",
    ],
    "roadmap": [
        {
            "category": "quality",
            "description": "Add linting to CI",
        }
    ],
}

config = AGILocalMachineTaskConfig(
    action_commands={
        "install dependencies": ("npm", "install"),
        "run tests": ("npm", "test"),
    }
)

plan = build_local_machine_plan_from_improvement(
    sample_improvement,
    config=config,
)

for task in plan.tasks:
    print(task.identifier, task.command)
```

The returned `LocalMachinePlan` includes ordered tasks, dependency information, and resource warnings so you can wire it into your automation runner or job scheduler.【F:dynamic_local_machine/engine.py†L13-L155】

## 5. Generate improvement plans from Dynamic AGI outputs

`DynamicAGIModel` orchestrates signal evaluation, risk management, position sizing, and self-improvement feedback. After calling `evaluate(...)`, the resulting `AGIOutput` may include an improvement plan which you can feed directly into the local machine bridge via `build_local_machine_plan_from_output`.【F:dynamic_agi/model.py†L33-L199】【F:dynamic_agi/model.py†L232-L326】【F:dynamic_agi/local_machine.py†L208-L220】

```python
from dynamic_agi.model import DynamicAGIModel
from dynamic_agi.local_machine import build_local_machine_plan_from_output

model = DynamicAGIModel()
output = model.evaluate(
    market_context=...,      # PreparedMarketContext instance
    research_payload=...,    # Research artefacts
    risk_context=...,        # Optional RiskContext overrides
)

plan = build_local_machine_plan_from_output(output)
```

Populate the placeholders with real market context, research inputs, and risk parameters from your environment. The self-improvement module records telemetry, synthesises recommended actions, and emits improvement plans that can immediately drive automation once your local machine configuration is in place.【F:dynamic_agi/self_improvement.py†L356-L520】【F:dynamic_agi/self_improvement.py†L497-L640】

## Docker login tip

If you need to authenticate Docker for subsequent automation tasks, avoid embedding access tokens in shell history by using the `--password-stdin` flag:

```bash
printf '%s' "$DOCKER_PAT" | docker login -u dynamiccapital --password-stdin
```

Replace `$DOCKER_PAT` with your personal access token in the current shell session when you run the command.
