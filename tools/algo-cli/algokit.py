#!/usr/bin/env python3
"""Utility CLI for scaffolding AlgoKit-style bot projects.

This repository previously expected a helper script at ``tools/algo-cli/algokit.py``
that mirrors a tiny subset of ``algokit``'s project bootstrap commands.  The
real AlgoKit is a much larger project, however for local development we only
need a small ergonomic layer that can generate boilerplate code for both the
Python and TypeScript runtimes used in this monorepo.

The script implemented here focuses on developer experience:

* Simple ``init`` command that accepts a project name and which runtimes to
  scaffold.
* Safe-by-default file generation (never overwrites existing files unless
  explicitly requested).
* Human-readable summary of actions as well as a ``--dry-run`` option to preview
  work.

The goal is not to be feature-complete, but to provide a pragmatic drop-in tool
so ``python tools/algo-cli/algokit.py init <name> --lang both`` works again.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent
from typing import Iterable, List, Sequence

# ---------------------------------------------------------------------------
# Data models and helpers
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FileOperation:
    """Represents a file that will be created or skipped."""

    path: Path
    action: str

    def __str__(self) -> str:  # pragma: no cover - trivial string formatting
        return f"[{self.action}] {self.path}"


class CliError(RuntimeError):
    """Base error for CLI failures."""


PROJECT_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]+$")


def sanitize_project_name(raw_name: str) -> str:
    """Validate and normalise the project name.

    The real AlgoKit allows a fairly broad set of characters but avoids
    whitespace.  We enforce a similar restriction so generated directories do
    not cause trouble on various filesystems.
    """

    name = raw_name.strip()
    if not name:
        raise CliError("Project name cannot be empty or whitespace only.")
    if not PROJECT_NAME_RE.fullmatch(name):
        raise CliError(
            "Project name may only contain letters, numbers, hyphens, underscores, "
            "and periods."
        )
    return name


# ---------------------------------------------------------------------------
# File creation utilities
# ---------------------------------------------------------------------------


def write_file(
    path: Path,
    content: str,
    *,
    dry_run: bool,
    overwrite: bool,
    operations: List[FileOperation],
) -> None:
    """Create ``path`` with ``content`` respecting the ``dry_run`` flag."""

    if dry_run:
        operations.append(FileOperation(path, "dry-run"))
        return

    if path.exists() and not overwrite:
        operations.append(FileOperation(path, "skip"))
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    operations.append(FileOperation(path, "write"))


# ---------------------------------------------------------------------------
# Template builders
# ---------------------------------------------------------------------------


def build_python_template(project_name: str) -> Iterable[tuple[Path, str]]:
    """Yield ``(path, content)`` pairs for the Python runtime."""

    base_dir = Path("python")
    main_py = dedent(
        f"""\
        \"\"\"Entrypoint for the {project_name} bot (Python runtime).\"\"\"


        def main() -> None:
            \"\"\"Kick off the bot.\"\"\"
            print("Hello from the {project_name} Python bot!")


        if __name__ == "__main__":
            main()
        """
    ).strip() + "\n"

    requirements = "# Add Python dependencies here\n"

    return [
        (base_dir / "main.py", main_py),
        (base_dir / "requirements.txt", requirements),
        (base_dir / "README.md", f"# Python runtime for {project_name}\n"),
    ]


def build_typescript_template(project_name: str) -> Iterable[tuple[Path, str]]:
    """Yield ``(path, content)`` pairs for the TypeScript runtime."""

    base_dir = Path("typescript")
    index_ts = dedent(
        f"""\
        export function main(): void {{
          console.log("Hello from the {project_name} TypeScript bot!");
        }}

        if (require.main === module) {{
          main();
        }}
        """
    ).strip() + "\n"

    package_json = {
        "name": project_name,
        "version": "0.1.0",
        "private": True,
        "type": "module",
        "scripts": {
            "start": "node --loader ts-node/esm src/index.ts",
            "build": "tsc"
        },
        "dependencies": {},
        "devDependencies": {
            "ts-node": "^10.9.2",
            "typescript": "^5.4.0"
        }
    }

    tsconfig = {
        "compilerOptions": {
            "target": "ES2020",
            "module": "ES2020",
            "moduleResolution": "node",
            "esModuleInterop": True,
            "forceConsistentCasingInFileNames": True,
            "strict": True,
            "skipLibCheck": True,
            "outDir": "dist"
        },
        "include": ["src"]
    }

    return [
        (base_dir / "src/index.ts", index_ts),
        (base_dir / "package.json", json.dumps(package_json, indent=2) + "\n"),
        (base_dir / "tsconfig.json", json.dumps(tsconfig, indent=2) + "\n"),
        (base_dir / "README.md", f"# TypeScript runtime for {project_name}\n"),
    ]


LANGUAGE_BUILDERS = {
    "python": build_python_template,
    "typescript": build_typescript_template,
}


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------


def handle_init(args: argparse.Namespace) -> int:
    project_name = sanitize_project_name(args.name)
    target_root = (Path(args.directory).expanduser() / project_name).resolve()

    if target_root.exists():
        if not target_root.is_dir():
            raise CliError(
                f"{target_root} exists and is not a directory. Use a different name or directory."
            )
        if any(target_root.iterdir()) and not args.force:
            raise CliError(
                "Target directory already exists and is not empty. Use --force to allow writing into it."
            )
    else:
        if not args.dry_run:
            target_root.mkdir(parents=True, exist_ok=True)

    selected_languages = _resolve_languages(args.lang)

    operations: List[FileOperation] = []

    project_readme = dedent(
        f"""\
        # {project_name}

        Generated with the lightweight ``algokit`` helper bundled with the Dynamic
        Capital repository.  The scaffold includes runtime-specific folders for the
        languages you selected during initialisation.

        ## Next steps

        * Explore the ``python`` and/or ``typescript`` directories for starter
          entrypoints.
        * Install dependencies for each runtime before running the bot.
        * Customise configuration inside ``algokit.project.json`` to track
          metadata about your project.
        """
    ).strip() + "\n"

    project_config = {
        "name": project_name,
        "languages": selected_languages,
        "version": "0.1.0",
        "template": "dynamic-capital/minimal",
    }

    files_to_create: List[tuple[Path, str]] = [
        (Path("README.md"), project_readme),
        (Path(".gitignore"), _default_gitignore()),
        (Path("algokit.project.json"), json.dumps(project_config, indent=2) + "\n"),
    ]

    for lang in selected_languages:
        builder = LANGUAGE_BUILDERS[lang]
        for relative_path, content in builder(project_name):
            files_to_create.append((relative_path, content))

    for relative_path, content in files_to_create:
        absolute_path = target_root / relative_path
        write_file(
            absolute_path,
            content,
            dry_run=args.dry_run,
            overwrite=args.overwrite,
            operations=operations,
        )

    for op in operations:
        print(op)

    if args.dry_run:
        print("Dry run complete. No files were written.")
    else:
        print(f"Project '{project_name}' initialised at {target_root}")

    return 0


def _resolve_languages(requested: str) -> List[str]:
    if requested == "both":
        return ["python", "typescript"]
    if requested in LANGUAGE_BUILDERS:
        return [requested]
    raise CliError(f"Unsupported language selection: {requested}")


def _default_gitignore() -> str:
    return dedent(
        """\
        # Runtime files
        __pycache__/
        *.pyc
        .Python
        env/
        venv/
        .venv/
        node_modules/
        dist/
        build/
        *.log

        # Environment
        .env
        .env.local

        # OS specific
        .DS_Store
        Thumbs.db
        """
    ).strip() + "\n"


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimal AlgoKit helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser(
        "init", help="Initialise a new project with Python and/or TypeScript runtimes"
    )
    init_parser.add_argument("name", help="Name of the project directory to create")
    init_parser.add_argument(
        "--lang",
        default="both",
        choices=["python", "typescript", "both"],
        help="Select which runtime templates to generate",
    )
    init_parser.add_argument(
        "--directory",
        "-d",
        default=".",
        help="Base directory in which the project folder should be created",
    )
    init_parser.add_argument(
        "--force",
        action="store_true",
        help="Allow writing into an existing, non-empty directory",
    )
    init_parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite individual files if they already exist",
    )
    init_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview generated files without touching the filesystem",
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "init":
            return handle_init(args)
        raise CliError(f"Unknown command: {args.command}")
    except CliError as exc:  # pragma: no cover - CLI convenience
        parser.exit(status=1, message=f"Error: {exc}\n")


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    sys.exit(main())
