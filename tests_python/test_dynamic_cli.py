"""Tests for the dynamic CLI orchestration toolkit."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_cli import (
    Argument,
    CLIContext,
    Command,
    CommandError,
    CommandResult,
    DynamicCLI,
    Option,
)


def _greet_handler(context: CLIContext, params: dict[str, object]) -> CommandResult:
    message = f"hello {params['name']}"
    if params.get("verbose"):
        message = message.upper()
    return CommandResult(message=message, data=params)


def _sum_handler(context: CLIContext, params: dict[str, object]) -> dict[str, object]:
    numbers: tuple[int, ...] = tuple(params.get("numbers", ()))
    return {"total": sum(numbers)}


def test_command_with_options_and_arguments() -> None:
    command = Command(
        name="greet",
        description="Send a friendly greeting.",
        handler=_greet_handler,
        arguments=(Argument("name"),),
        options=(
            Option("--times", aliases=("-t",), parser=int, default=1, help_text="Number of times to greet."),
            Option("--verbose", aliases=("-v",), expects_value=False, help_text="Use emphasised output."),
            Option("--tag", aliases=("-g",), multiple=True, help_text="Attach optional tags to the greeting."),
        ),
    )
    cli = DynamicCLI(command)

    result = cli.dispatch(["Ada", "--times", "3", "--verbose", "--tag", "alpha", "--tag", "beta"])

    assert result.message == "HELLO ADA"
    assert result.data["times"] == 3
    assert result.data["tag"] == ("alpha", "beta")
    assert result.data["name"] == "Ada"


def test_required_option_resolved_from_environment() -> None:
    command = Command(
        name="greet",
        description="Send a friendly greeting.",
        handler=_greet_handler,
        arguments=(Argument("name"),),
        options=(
            Option("--api-key", required=True, env_var="API_KEY", help_text="Authentication token."),
        ),
    )
    cli = DynamicCLI(command, env={"API_KEY": "secret"})

    result = cli.dispatch(["Nova"])

    assert result.data["api_key"] == "secret"


def test_variadic_arguments() -> None:
    subcommand = Command(
        name="sum",
        description="Calculate the sum of integers.",
        handler=_sum_handler,
        arguments=(
            Argument("numbers", parser=int, multiple=True, required=True, help_text="Numbers to aggregate."),
        ),
    )
    root = Command(
        name="math",
        description="Collection of handy math utilities.",
        subcommands=(subcommand,),
    )
    cli = DynamicCLI(root)

    result = cli.dispatch(["sum", "1", "2", "3", "4"])

    assert result.data == {"total": 10}


def test_help_rendering_includes_program_path() -> None:
    subcommand = Command(
        name="sum",
        description="Calculate the sum of integers.",
        handler=_sum_handler,
        arguments=(
            Argument("numbers", parser=int, multiple=True, required=True, help_text="Numbers to aggregate."),
        ),
    )
    root = Command(
        name="math",
        description="Collection of handy math utilities.",
        subcommands=(subcommand,),
    )
    cli = DynamicCLI(root, program_name="dynamic")
    stdout = io.StringIO()
    context = CLIContext(env={}, stdout=stdout, stderr=io.StringIO())

    result = cli.dispatch(["sum", "--help"], context=context)

    help_output = stdout.getvalue()
    assert "Usage: dynamic sum" in help_output
    assert "Calculate the sum of integers." in help_output
    assert result.message == "help"


def test_missing_required_option_raises() -> None:
    command = Command(
        name="greet",
        description="Send a friendly greeting.",
        handler=_greet_handler,
        options=(
            Option("--recipient", required=True, help_text="Person to greet."),
        ),
    )
    cli = DynamicCLI(command)

    with pytest.raises(CommandError):
        cli.dispatch([])


def test_root_help_avoids_duplicate_program_name() -> None:
    command = Command(
        name="greet",
        description="Send a friendly greeting.",
        handler=_greet_handler,
        arguments=(Argument("name"),),
    )
    cli = DynamicCLI(command)
    stdout = io.StringIO()
    context = CLIContext(env={}, stdout=stdout, stderr=io.StringIO())

    result = cli.dispatch(["--help"], context=context)

    help_output = stdout.getvalue()
    assert "Usage: greet" in help_output
    assert "Usage: greet greet" not in help_output
    assert result.message == "help"


def test_count_option_env_default_is_respected() -> None:
    command = Command(
        name="greet",
        description="Send a friendly greeting.",
        handler=_greet_handler,
        arguments=(Argument("name"),),
        options=(
            Option(
                "--verbose",
                aliases=("-v",),
                expects_value=False,
                multiple=True,
                env_var="VERBOSE_COUNT",
                help_text="Increase emphasis level.",
            ),
        ),
    )
    cli = DynamicCLI(command, env={"VERBOSE_COUNT": "2"})

    result = cli.dispatch(["Ada"])

    assert result.message == "HELLO ADA"
    assert result.data["verbose"] == 2


def test_invalid_boolean_environment_value_raises() -> None:
    command = Command(
        name="greet",
        description="Send a friendly greeting.",
        handler=_greet_handler,
        arguments=(Argument("name"),),
        options=(
            Option(
                "--verbose",
                aliases=("-v",),
                expects_value=False,
                env_var="VERBOSE",
            ),
        ),
    )
    cli = DynamicCLI(command, env={"VERBOSE": "maybe"})

    with pytest.raises(CommandError):
        cli.dispatch(["Ada"])
