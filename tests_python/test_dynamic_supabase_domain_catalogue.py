from __future__ import annotations

from pathlib import Path

from dynamic_supabase.domain_catalogue import (
    DOMAIN_SUPABASE_BLUEPRINTS,
    _discover_supabase_functions,
)


def test_discover_supabase_functions_filters_non_functions(tmp_path: Path) -> None:
    functions_root = tmp_path / "functions"
    functions_root.mkdir()

    # Valid edge function
    alpha_dir = functions_root / "alpha"
    alpha_dir.mkdir()
    (alpha_dir / "index.ts").write_text("// alpha function\n", encoding="utf-8")

    # Hidden and underscored directories should be ignored even with entry files
    hidden_dir = functions_root / ".hidden"
    hidden_dir.mkdir()
    (hidden_dir / "index.ts").write_text("// hidden\n", encoding="utf-8")

    internal_dir = functions_root / "_internal"
    internal_dir.mkdir()
    (internal_dir / "index.ts").write_text("// internal\n", encoding="utf-8")

    # Directory without an entry file should also be ignored
    docs_dir = functions_root / "docs"
    docs_dir.mkdir()
    (docs_dir / "README.md").write_text("docs", encoding="utf-8")

    discovered = _discover_supabase_functions(functions_root)

    assert {fn.name for fn in discovered} == {"alpha"}

    alpha_blueprint = discovered[0]
    assert alpha_blueprint.endpoint == "/functions/v1/alpha"
    assert alpha_blueprint.metadata["path"] == "functions/alpha"
    assert alpha_blueprint.metadata["source"] == "filesystem"


def test_edge_domain_catalogue_includes_repository_functions() -> None:
    edge_domain = DOMAIN_SUPABASE_BLUEPRINTS["edge"]
    names = {fn.name for fn in edge_domain.functions}

    # Sanity check a few well-known functions from the repository
    assert "analysis-ingest" in names
    assert "telegram-bot" in names
    assert len(names) > 25
