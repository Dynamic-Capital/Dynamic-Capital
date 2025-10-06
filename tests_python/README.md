# Python Test Suite Setup

This directory houses regression tests for Dynamic Capital's Python packages.
Follow the steps below to provision the dependencies and execute the suite.

## Install Dependencies

Use the pinned requirements file to install PyTorch's CPU wheel, the test
runner, and supporting libraries. The `--extra-index-url` entry ensures pip
resolves the CPU-only distribution without attempting to download CUDA
artifacts.

```bash
pip install -r tests_python/requirements.txt
```

If you prefer to run the commands manually, mirror the requirement pins:

```bash
pip install --index-url https://download.pytorch.org/whl/cpu torch==2.4.1+cpu
pip install pytest==8.3.3
```

## Run the Tests

After installing dependencies from the repository root, run the GPT regression
suite:

```bash
pytest tests_python/test_dynamic_gpt_model.py
```

When PyTorch is unavailable the module-level `pytest.importorskip("torch")`
call skips the suite, so installing the dependency is required for a full pass.
The torch instantiation helper accepts dtype hints from metadata keys such as
`torch_dtype`, `torch.dtype`, `torch dtype`, or `torch-dtype` (normalising key
separators and case) and recognises extended strings such as `"torch.float32"`
in addition to the shorter aliases like `"bf16"` and `"float16"`.
