from __future__ import annotations

import json
from pathlib import Path

import pytest

EXPECTED_SWC_OPTIONAL = {
    "@next/swc-darwin-arm64",
    "@next/swc-darwin-x64",
    "@next/swc-linux-arm64-gnu",
    "@next/swc-linux-arm64-musl",
    "@next/swc-linux-x64-gnu",
    "@next/swc-linux-x64-musl",
    "@next/swc-win32-arm64-msvc",
    "@next/swc-win32-x64-msvc",
}

LOCKFILES_WITH_NEXT = (
    Path("package-lock.json"),
    Path("dynamic-capital-ton/apps/miniapp/package-lock.json"),
)


@pytest.mark.parametrize("lockfile", LOCKFILES_WITH_NEXT)
def test_next_optional_dependencies_are_complete(lockfile: Path) -> None:
    data = json.loads(lockfile.read_text())
    packages = data.get("packages", {})
    next_pkg = packages.get("node_modules/next")
    assert next_pkg is not None, f"next package missing from {lockfile}"

    optional = next_pkg.get("optionalDependencies", {})
    swc_keys = {name for name in optional if name.startswith("@next/swc-")}

    missing = EXPECTED_SWC_OPTIONAL - swc_keys
    assert not missing, f"{lockfile} missing SWC builds: {sorted(missing)}"

    unexpected = swc_keys - EXPECTED_SWC_OPTIONAL
    assert not unexpected, f"{lockfile} has unexpected SWC builds: {sorted(unexpected)}"


def test_deno_lock_next_optional_dependencies_are_complete() -> None:
    data = json.loads(Path("deno.lock").read_text())
    npm_packages = data.get("packages", {}).get("npm", {})

    next_entries = {
        name: meta for name, meta in npm_packages.items() if name.startswith("next@")
    }
    assert next_entries, "No next packages found in deno.lock"

    for name, meta in next_entries.items():
        deps = meta.get("dependencies", {})
        swc_keys = {dep for dep in deps if dep.startswith("@next/swc-")}

        missing = EXPECTED_SWC_OPTIONAL - swc_keys
        assert not missing, f"{name} missing SWC builds: {sorted(missing)}"

        unexpected = swc_keys - EXPECTED_SWC_OPTIONAL
        assert not unexpected, f"{name} has unexpected SWC builds: {sorted(unexpected)}"
