# ML Environment Installation Guide

This guide outlines how to provision and verify the dependencies listed in
`ml/requirements.txt`.

## Prerequisites

- Python 3.12 (the automation container uses 3.12.10)
- `pip` 24 or newer
- At least 12 GB of free disk space (the CUDA-enabled PyTorch wheel alone is
  ~2 GB)
- Stable network connectivity for large binary downloads

## Quick Start

1. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
2. Upgrade packaging tools inside the environment:
   ```bash
   python -m pip install --upgrade pip setuptools wheel
   ```
3. Install the dependency set:
   ```bash
   python -m pip install --no-cache-dir -r ml/requirements.txt
   ```

> **Note:** The default install route downloads the CUDA-enabled PyTorch
> distribution along with supporting NVIDIA libraries. Allocate 10–15 minutes on
> a typical cloud workstation for the full installation to complete.

## Optional CPU-Only PyTorch Install

If GPU acceleration is not required, install the CPU wheel immediately after the
main requirements run to avoid downloading the CUDA toolchain:

```bash
python -m pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.8.0+cpu
```

This keeps the dependency versions aligned while reducing the download size to
~400 MB.

## Verification Log

| Date       | Python  | Status       | Notes |
|------------|---------|--------------|-------|
| 2025-10-06 | 3.12.10 | ⚠️ Interrupted | Manual cancellation after CUDA wheel download began. Re-run when GPU support is required. |

Update the table with additional verification runs to maintain an audit trail.

## Troubleshooting

- **Disk space errors:** Clear the pip cache (`pip cache purge`) and retry with
  `--no-cache-dir`.
- **Timeouts or TLS resets:** Retry the install; large wheels may require
  several minutes to download.
- **Dependency resolution conflicts:** Use `pip check` after installation and
  pin additional packages as needed.
- **Replacing CUDA builds:** Use the CPU-only command above if GPU libraries are
  unnecessary in the deployment environment.
