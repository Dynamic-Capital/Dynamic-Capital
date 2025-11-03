"""Composable command line interface primitives for Dynamic Capital."""

from __future__ import annotations

import asyncio
import inspect
import os
import sys
import textwrap
from dataclasses import dataclass, field
from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
    Iterator,
    Mapping,
    MutableMapping,
    Sequence,
)

__all__ = [
    "Argument",
    "CLIContext",
    "Command",
    "CommandError",
    "CommandResult",
    "DynamicCLI",
    "Option",
]


_MISSING: object = object()
_TRUE_VALUES: tuple[str, ...] = ("1", "true", "yes", "on", "enable", "enabled")
_FALSE_VALUES: tuple[str, ...] = ("0", "false", "no", "off", "disable", "disabled")
_HELP_WIDTH: int = 88


def _normalise_flag(flag: str) -> str:
    cleaned = flag.strip()
    if not cleaned:
        raise ValueError("flag must not be empty")
    if cleaned.startswith("--"):
        return cleaned
    if cleaned.startswith("-"):
        if len(cleaned) == 2:
            return cleaned
        raise ValueError("short flags must be a single character (e.g. '-v')")
    if len(cleaned) == 1:
        return f"-{cleaned}"
    return f"--{cleaned}"


def _normalise_alias(alias: str) -> str:
    cleaned = alias.strip()
    if not cleaned:
        raise ValueError("alias must not be empty")
    if cleaned.startswith("-"):
        return _normalise_flag(cleaned)
    if len(cleaned) == 1:
        return f"-{cleaned}"
    return f"--{cleaned}"


def _normalise_identifier(value: str, *, allow_dashes: bool = True) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    if not allow_dashes and "-" in cleaned:
        raise ValueError("identifier must not contain dashes")
    return cleaned


def _split_env_list(value: str) -> tuple[str, ...]:
    items: list[str] = []
    for part in value.split(","):
        cleaned = part.strip()
        if cleaned:
            items.append(cleaned)
    return tuple(items)


def _coerce_bool(value: str | bool | None) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    lowered = value.strip().lower()
    if lowered in _TRUE_VALUES:
        return True
    if lowered in _FALSE_VALUES or lowered == "":
        return False
    raise ValueError(f"unable to coerce '{value}' to a boolean")


@dataclass(slots=True, frozen=True)
class Option:
    """Definition describing an option/flag accepted by a command."""

    flag: str
    aliases: tuple[str, ...] = field(default_factory=tuple)
    expects_value: bool = True
    parser: Callable[[str], Any] = str
    default: object = field(default=_MISSING)
    required: bool = False
    help_text: str = ""
    choices: tuple[Any, ...] | None = None
    env_var: str | None = None
    multiple: bool = False
    placeholder: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "flag", _normalise_flag(self.flag))
        object.__setattr__(self, "aliases", tuple(_normalise_alias(alias) for alias in self.aliases))
        if self.choices is not None and not self.expects_value:
            raise ValueError("choices can only be used with value-accepting options")
        if self.multiple and not self.expects_value:
            # Count-style toggles are supported by treating the parser as an int coercer
            object.__setattr__(self, "parser", int)

    @property
    def key(self) -> str:
        """Dictionary key used when returning parsed results."""

        base = self.flag.lstrip("-")
        return base.replace("-", "_")

    @property
    def flags(self) -> tuple[str, ...]:
        return (self.flag, *self.aliases)

    def initial_value(self, env: Mapping[str, str]) -> object:
        if self.env_var:
            raw = env.get(self.env_var)
            if raw is not None:
                return self._convert_environment_value(raw)
        if self.default is not _MISSING:
            if self.multiple and isinstance(self.default, Sequence) and not isinstance(self.default, str):
                return tuple(self.default)
            return self.default
        if self.multiple and self.expects_value:
            return tuple()
        if not self.expects_value:
            return False
        return _MISSING

    def matches(self, token: str) -> bool:
        return token in self.flags

    def consume(self, tokens: Iterator[str], values: MutableMapping[str, Any]) -> None:
        if not self.expects_value:
            if self.multiple:
                current = int(values.get(self.key, 0))
                values[self.key] = current + 1
            else:
                values[self.key] = True
            return
        try:
            raw = next(tokens)
        except StopIteration as exc:  # pragma: no cover - defensive guard
            raise CommandError(f"option {self.flag} requires a value") from exc
        parsed = self._convert_value(raw)
        if self.multiple:
            bucket = values.get(self.key)
            if isinstance(bucket, list):
                bucket.append(parsed)
            else:
                collected: list[Any] = []
                if bucket:
                    if isinstance(bucket, tuple):
                        collected.extend(bucket)
                    else:
                        collected.append(bucket)
                collected.append(parsed)
                values[self.key] = collected
        else:
            values[self.key] = parsed

    def usage_fragment(self) -> str:
        if not self.expects_value:
            return self.flag
        placeholder = self.placeholder or self.key.upper()
        if self.multiple:
            return f"{self.flag} <{placeholder}>..."
        return f"{self.flag} <{placeholder}>"

    def _convert_environment_value(self, raw: str) -> Any:
        if not self.expects_value:
            if self.multiple:
                value = raw.strip()
                if value == "":
                    return 0
                try:
                    count = int(value, 10)
                except ValueError as exc:  # pragma: no cover - defensive guard
                    raise CommandError(
                        f"invalid count '{raw}' for option {self.flag}"
                    ) from exc
                if count < 0:
                    raise CommandError(
                        f"invalid count '{raw}' for option {self.flag}"
                    )
                return count
            try:
                return _coerce_bool(raw)
            except ValueError as exc:  # pragma: no cover - defensive guard
                raise CommandError(
                    f"invalid boolean '{raw}' for option {self.flag}"
                ) from exc
        if self.multiple:
            values = _split_env_list(raw)
            return tuple(self._convert_value(item) for item in values)
        return self._convert_value(raw)

    def _convert_value(self, raw: str) -> Any:
        try:
            parsed = self.parser(raw)
        except Exception as exc:  # pragma: no cover - parser errors
            raise CommandError(f"invalid value '{raw}' for option {self.flag}") from exc
        if self.choices is not None and parsed not in self.choices:
            choices = ", ".join(str(choice) for choice in self.choices)
            raise CommandError(f"{self.flag} must be one of: {choices}")
        return parsed


@dataclass(slots=True, frozen=True)
class Argument:
    """Positional argument consumed by a command."""

    name: str
    parser: Callable[[str], Any] = str
    default: object = field(default=_MISSING)
    required: bool = True
    help_text: str = ""
    multiple: bool = False
    placeholder: str | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "name", _normalise_identifier(self.name, allow_dashes=False))
        if self.multiple and self.default is not _MISSING:
            raise ValueError("variadic arguments cannot define a default")

    @property
    def display_name(self) -> str:
        return self.placeholder or self.name.upper()

    def usage_fragment(self) -> str:
        fragment = self.display_name
        if self.multiple:
            fragment = f"{fragment}..."
        if not self.required:
            fragment = f"[{fragment}]"
        return fragment

    def consume(self, positionals: list[str]) -> tuple[Any, list[str]]:
        if self.multiple:
            if not positionals:
                if self.required:
                    raise CommandError(f"argument '{self.name}' requires at least one value")
                return tuple(), []
            parsed = tuple(self._convert(value) for value in positionals)
            return parsed, []
        if not positionals:
            if self.required:
                raise CommandError(f"argument '{self.name}' is required")
            if self.default is not _MISSING:
                return self.default, []
            return None, []
        raw = positionals[0]
        return self._convert(raw), positionals[1:]

    def _convert(self, raw: str) -> Any:
        try:
            return self.parser(raw)
        except Exception as exc:  # pragma: no cover - parser errors
            raise CommandError(f"unable to parse value '{raw}' for argument '{self.name}'") from exc


class CommandError(RuntimeError):
    """Raised when parsing or executing a command fails."""


class HelpRequested(CommandError):
    """Internal signal used to bubble help rendering to the CLI dispatcher."""

    def __init__(self, command: "Command", context: "CLIContext") -> None:
        super().__init__("help requested")
        self.command = command
        self.context = context


@dataclass(slots=True, frozen=True)
class CommandResult:
    """Represents the outcome of executing a command handler."""

    status: int = 0
    message: str = ""
    data: Mapping[str, Any] | None = None

    def __post_init__(self) -> None:
        if self.data is not None and not isinstance(self.data, Mapping):
            raise TypeError("data must be a mapping")


CommandReturn = CommandResult | Mapping[str, Any] | str | None

CommandHandler = Callable[["CLIContext", Mapping[str, Any]], CommandReturn | Awaitable[CommandReturn]]


@dataclass(slots=True)
class CLIContext:
    """Execution context passed to command handlers."""

    env: Mapping[str, str]
    stdout: Any = sys.stdout
    stderr: Any = sys.stderr
    command_path: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, Any] | None = None

    def derive(self, segment: str) -> "CLIContext":
        return CLIContext(
            env=self.env,
            stdout=self.stdout,
            stderr=self.stderr,
            command_path=self.command_path + (segment,),
            metadata=self.metadata,
        )

    def write(self, message: str, *, stream: str = "stdout", end: str = "\n") -> None:
        target = self.stdout if stream == "stdout" else self.stderr
        target.write(message)
        if end:
            target.write(end)
        target.flush()


@dataclass(slots=True)
class Command:
    """Node within a command tree."""

    name: str
    description: str
    handler: CommandHandler | None = None
    options: tuple[Option, ...] = field(default_factory=tuple)
    arguments: tuple[Argument, ...] = field(default_factory=tuple)
    subcommands: tuple["Command", ...] = field(default_factory=tuple)
    aliases: tuple[str, ...] = field(default_factory=tuple)
    epilog: str | None = None
    _flag_map: Dict[str, Option] = field(init=False, repr=False)
    _subcommand_map: Dict[str, "Command"] = field(init=False, repr=False)
    _help_cache: Dict[str, str] = field(init=False, repr=False, default_factory=dict)
    _usage_cache: Dict[str, str] = field(init=False, repr=False, default_factory=dict)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name, allow_dashes=False)
        self.aliases = tuple(_normalise_identifier(alias, allow_dashes=False) for alias in self.aliases)
        self._flag_map = {}
        for option in self.options:
            for flag in option.flags:
                if flag in self._flag_map:
                    raise ValueError(f"flag '{flag}' is defined multiple times for command '{self.name}'")
                self._flag_map[flag] = option
        self._subcommand_map = {}
        for subcommand in self.subcommands:
            self._register_subcommand(subcommand)

    def _invalidate_caches(self) -> None:
        self._help_cache.clear()
        self._usage_cache.clear()

    def _register_subcommand(self, subcommand: "Command") -> None:
        if subcommand.name in self._subcommand_map:
            raise ValueError(f"duplicate subcommand name '{subcommand.name}' under '{self.name}'")
        self._subcommand_map[subcommand.name] = subcommand
        for alias in subcommand.aliases:
            if alias in self._subcommand_map:
                raise ValueError(f"duplicate subcommand alias '{alias}' under '{self.name}'")
            self._subcommand_map[alias] = subcommand
        self._invalidate_caches()

    def execute(self, argv: Sequence[str], context: CLIContext) -> CommandResult:
        current_context = context.derive(self.name)
        tokens = list(argv)
        if tokens and tokens[0] in {"-h", "--help"}:
            raise HelpRequested(self, current_context)
        if tokens and tokens[0] in self._subcommand_map:
            subcommand = self._subcommand_map[tokens[0]]
            return subcommand.execute(tokens[1:], current_context)
        if not tokens and self.subcommands and self.handler is None:
            raise HelpRequested(self, current_context)
        parameters = self._parse(tokens, current_context)
        if self.handler is None:
            raise CommandError(f"command '{self.name}' does not implement a handler")
        result = self.handler(current_context, parameters)
        return _normalise_result(result)

    def format_help(self, *, program: str = "") -> str:
        cache_key = program or ""
        cached = self._help_cache.get(cache_key)
        if cached is not None:
            return cached

        usage = self._format_usage(program=program)
        lines = [usage, "", textwrap.fill(self.description, width=_HELP_WIDTH)]
        if self.arguments:
            lines.append("")
            lines.append("Arguments:")
            for argument in self.arguments:
                lines.append(self._format_help_entry(argument.usage_fragment(), argument.help_text))
        if self.options:
            lines.append("")
            lines.append("Options:")
            for option in self.options:
                flags = ", ".join(option.flags)
                if option.expects_value:
                    placeholder = option.placeholder or option.key.upper()
                    if option.multiple:
                        flags = f"{flags} <{placeholder}>..."
                    else:
                        flags = f"{flags} <{placeholder}>"
                lines.append(self._format_help_entry(flags, option.help_text))
                if option.env_var:
                    env_hint = f"Env: {option.env_var}"
                    lines.append(self._format_help_entry("", env_hint))
        if self.subcommands:
            lines.append("")
            lines.append("Subcommands:")
            seen: set[str] = set()
            for subcommand in self.subcommands:
                if subcommand.name in seen:
                    continue
                seen.add(subcommand.name)
                lines.append(self._format_help_entry(subcommand.name, subcommand.description))
        if self.epilog:
            lines.append("")
            lines.append(textwrap.fill(self.epilog, width=_HELP_WIDTH))
        rendered = "\n".join(lines).strip()
        self._help_cache[cache_key] = rendered
        return rendered

    def _format_help_entry(self, label: str, text: str) -> str:
        label = label.strip()
        if not text:
            return f"  {label}" if label else ""
        wrapped = textwrap.fill(text, width=_HELP_WIDTH)
        first_line, *rest = wrapped.splitlines() or [""]
        lines = [f"  {label.ljust(28)}{first_line}"]
        for continuation in rest:
            lines.append(f"  {'':28}{continuation}")
        return "\n".join(lines)

    def _format_usage(self, *, program: str = "") -> str:
        segments: list[str] = []
        if program:
            segments.append(program)
        segments.append(self.name)
        if self.subcommands:
            segments.append("<command>")
        if self.options:
            segments.append("[options]")
        for argument in self.arguments:
            segments.append(argument.usage_fragment())
        usage = " ".join(segments)
        cache_key = program or ""
        cached = self._usage_cache.get(cache_key)
        if cached is not None:
            return cached
        formatted = f"Usage: {usage}".strip()
        self._usage_cache[cache_key] = formatted
        return formatted

    def _parse(self, tokens: list[str], context: CLIContext) -> Dict[str, Any]:
        values: Dict[str, Any] = {}
        for option in self.options:
            initial = option.initial_value(context.env)
            if initial is _MISSING:
                continue
            if option.multiple and option.expects_value:
                if isinstance(initial, Sequence) and not isinstance(initial, (str, bytes, bytearray)):
                    values[option.key] = list(initial)
                elif initial is None:
                    values[option.key] = []
                else:
                    values[option.key] = [initial]
            else:
                values[option.key] = initial
        iterator = iter(tokens)
        positionals: list[str] = []
        for token in iterator:
            if token in {"-h", "--help"}:
                raise HelpRequested(self, context)
            if token == "--":
                positionals.extend(list(iterator))
                break
            if token.startswith("-"):
                option = self._flag_map.get(token)
                if option is None:
                    raise CommandError(f"unrecognised option '{token}' for command '{self.name}'")
                option.consume(iterator, values)
            else:
                positionals.append(token)
        parsed_args: Dict[str, Any] = {}
        remaining = positionals
        for argument in self.arguments:
            value, remaining = argument.consume(remaining)
            parsed_args[argument.name] = value
        if remaining:
            raise CommandError(f"received unexpected arguments: {' '.join(remaining)}")
        for option in self.options:
            key = option.key
            if option.required and key not in values:
                raise CommandError(f"missing required option '{option.flag}'")
            if option.multiple and option.expects_value:
                bucket = values.get(key)
                if bucket is None:
                    values[key] = tuple()
                elif isinstance(bucket, list):
                    values[key] = tuple(bucket)
                elif isinstance(bucket, tuple):
                    values[key] = bucket
                else:
                    values[key] = (bucket,)
            elif key not in values:
                values[key] = None
        merged: Dict[str, Any] = {**values, **parsed_args}
        return merged


@dataclass(slots=True)
class DynamicCLI:
    """Entry point orchestrating command execution."""

    root: Command
    program_name: str | None = None
    env: Mapping[str, str] | None = None

    def dispatch(self, argv: Sequence[str], *, context: CLIContext | None = None) -> CommandResult:
        env = self.env or os.environ
        base_context = context or CLIContext(env=env, command_path=())
        try:
            return self.root.execute(argv, base_context)
        except HelpRequested as help_request:
            path = help_request.context.command_path
            parent_program = " ".join(path[:-1]) if path else ""
            if self.program_name:
                program = self.program_name
            elif parent_program:
                program = parent_program
            else:
                program = ""
            help_text = help_request.command.format_help(program=program)
            base_context.write(help_text)
            return CommandResult(status=0, message="help", data={"help": help_text})

    def run(self, argv: Sequence[str] | None = None) -> int:
        arguments = list(argv) if argv is not None else sys.argv[1:]
        result = self.dispatch(arguments)
        if result.message:
            sys.stdout.write(f"{result.message}\n")
        return int(result.status)


def _normalise_result(result: Any) -> CommandResult:
    if isinstance(result, CommandResult):
        return result
    if inspect.isawaitable(result):
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            resolved = asyncio.run(result)
        else:  # pragma: no cover - asynchronous execution inside running loop
            raise RuntimeError("cannot execute asynchronous command while an event loop is running")
        return _normalise_result(resolved)
    if result is None:
        return CommandResult()
    if isinstance(result, Mapping):
        return CommandResult(data=result)
    if isinstance(result, str):
        return CommandResult(message=result)
    return CommandResult(data={"result": result})
