# Python Test Suite Setup

This directory houses regression tests for Dynamic Capital's Python packages.
Follow the steps below to provision the dependencies and execute the suite.

## Install Dependencies

Use the pinned requirements file to install PyTorch's CPU wheel and the
supporting libraries. The `--extra-index-url` entry ensures pip resolves the
CPU-only distribution without attempting to download CUDA artifacts.

```bash
pip install -r tests_python/requirements.txt
```

If you prefer to run the command manually, mirror the requirement pin:

```bash
pip install --index-url https://download.pytorch.org/whl/cpu torch==2.4.1+cpu
```

## Run the Tests

After installing dependencies from the repository root, run the GPT regression
suite:

```bash
pytest tests_python/test_dynamic_gpt_model.py
```

When PyTorch is unavailable the module-level `pytest.importorskip("torch")`
call skips the suite, so installing the dependency is required for a full pass.
