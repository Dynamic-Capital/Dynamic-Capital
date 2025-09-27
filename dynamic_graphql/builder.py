"""Utilities for constructing GraphQL documents dynamically.

The module focuses on a declarative, composable API so that callers can
assemble GraphQL operations without needing to format strings by hand.  It is
purposefully limited to the GraphQL specification primitives required for the
Dynamic Capital stack (operations, fields, fragments and variables) while still
being expressive enough to cover the majority of query authoring scenarios.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "GraphQLArgument",
    "GraphQLDocument",
    "GraphQLField",
    "GraphQLFragment",
    "GraphQLFragmentSpread",
    "GraphQLOperation",
    "GraphQLSelection",
    "GraphQLSelectionSet",
    "GraphQLVariable",
    "GraphQLVariableReference",
    "build_mutation",
    "build_query",
    "build_subscription",
]

_INDENT = " " * 2


def _ensure_identifier(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("GraphQL identifiers must not be empty")
    if not (value[0].isalpha() or value[0] == "_"):
        raise ValueError(f"invalid GraphQL identifier: {value!r}")
    for char in value[1:]:
        if not (char.isalnum() or char == "_"):
            raise ValueError(f"invalid GraphQL identifier: {value!r}")
    return value


def _value_to_literal(value: object) -> str:
    if isinstance(value, GraphQLVariableReference):
        return value.render()
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        escaped = value.translate({
            ord("\\"): "\\\\",
            ord("\""): "\\\"",
        })
        return f'"{escaped}"'
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        inner = ", ".join(_value_to_literal(item) for item in value)
        return f"[{inner}]"
    if isinstance(value, Mapping):
        inner = ", ".join(
            f"{_ensure_identifier(str(key))}: {_value_to_literal(val)}"
            for key, val in value.items()
        )
        return f"{{{inner}}}"
    raise TypeError(f"unsupported GraphQL literal: {value!r}")


@dataclass(slots=True)
class GraphQLVariableReference:
    """Reference to a variable defined on the enclosing operation."""

    name: str

    def __post_init__(self) -> None:  # pragma: no cover - trivial
        self.name = _ensure_identifier(self.name)

    def render(self) -> str:
        return f"${self.name}"


@dataclass(slots=True, frozen=True)
class GraphQLVariable:
    """Variable definition for a GraphQL operation."""

    name: str
    type_: str
    default: object | None = None
    description: str | None = None

    def __post_init__(self) -> None:
        _ensure_identifier(self.name)
        if not self.type_:
            raise ValueError("variable type must not be empty")

    @property
    def has_default(self) -> bool:
        return self.default is not None

    def render(self) -> str:
        default = f" = {_value_to_literal(self.default)}" if self.has_default else ""
        return f"${self.name}: {self.type_}{default}"


@dataclass(slots=True, frozen=True)
class GraphQLArgument:
    """Argument applied to a field."""

    name: str
    value: object

    def __post_init__(self) -> None:
        _ensure_identifier(self.name)

    def render(self) -> str:
        return f"{self.name}: {_value_to_literal(self.value)}"


@dataclass(slots=True)
class GraphQLSelection:
    """Base class for any renderable selection node."""

    alias: str | None
    name: str
    arguments: tuple[GraphQLArgument, ...] = ()
    selections: "GraphQLSelectionSet | None" = None

    def __post_init__(self) -> None:
        self.name = _ensure_identifier(self.name)
        if self.alias is not None:
            self.alias = _ensure_identifier(self.alias)
        if self.selections is not None and not isinstance(
            self.selections, GraphQLSelectionSet
        ):
            raise TypeError("selections must be a GraphQLSelectionSet")

    def render(self, indent: int = 0) -> str:
        alias = f"{self.alias}: " if self.alias else ""
        arguments = (
            "(" + ", ".join(argument.render() for argument in self.arguments) + ")"
            if self.arguments
            else ""
        )
        if self.selections:
            inner = self.selections.render(indent + 1)
            return f"{alias}{self.name}{arguments} {{\n{inner}\n{_INDENT * indent}}}"
        return f"{alias}{self.name}{arguments}"


@dataclass(slots=True)
class GraphQLSelectionSet:
    """Container for a collection of selections."""

    selections: tuple[GraphQLSelection, ...]

    def __post_init__(self) -> None:
        if not self.selections:
            raise ValueError("selection set must contain at least one selection")

    def render(self, indent: int = 0) -> str:
        prefix = _INDENT * indent
        return "\n".join(prefix + selection.render(indent) for selection in self.selections)


@dataclass(slots=True)
class GraphQLField(GraphQLSelection):
    """Concrete field selection."""

    alias: str | None = None
    name: str = field(default="")
    arguments: tuple[GraphQLArgument, ...] = ()
    selections: GraphQLSelectionSet | None = None


class GraphQLFragmentSpread(GraphQLSelection):
    """Reference to a named fragment within a selection set."""

    def __init__(self, name: str) -> None:
        super().__init__(alias=None, name=name, arguments=(), selections=None)

    def render(self, indent: int = 0) -> str:
        return f"...{self.name}"


@dataclass(slots=True)
class GraphQLFragment:
    """Fragment that can be reused across operations."""

    name: str
    type_condition: str
    selection_set: GraphQLSelectionSet

    def __post_init__(self) -> None:
        self.name = _ensure_identifier(self.name)
        if not self.type_condition:
            raise ValueError("fragment type condition must not be empty")

    def render(self) -> str:
        inner = self.selection_set.render(1)
        return f"fragment {self.name} on {self.type_condition} {{\n{inner}\n}}"


@dataclass(slots=True)
class GraphQLOperation:
    """GraphQL operation (query, mutation or subscription)."""

    operation_type: str
    name: str | None
    selection_set: GraphQLSelectionSet
    variables: tuple[GraphQLVariable, ...] = ()
    directives: Sequence[str] = ()

    def __post_init__(self) -> None:
        operation_type = self.operation_type.lower()
        if operation_type not in {"query", "mutation", "subscription"}:
            raise ValueError(f"unknown GraphQL operation type: {self.operation_type!r}")
        self.operation_type = operation_type
        if self.name is not None:
            self.name = _ensure_identifier(self.name)
        directive_prefix = "@"
        for directive in self.directives:
            directive = directive.strip()
            if not directive:
                raise ValueError("directives must not be empty")
            if not directive.startswith(directive_prefix):
                raise ValueError("directives must begin with '@'")

    def render(self) -> str:
        header = self.operation_type
        variable_section = (
            "(" + ", ".join(variable.render() for variable in self.variables) + ")"
            if self.variables
            else ""
        )
        if self.name or variable_section or self.directives:
            header += " "
            if self.name:
                header += self.name
            if variable_section:
                if not self.name:
                    header += ""
                header += variable_section
            if self.directives:
                header += " " + " ".join(self.directives)
        inner = self.selection_set.render(1)
        return f"{header} {{\n{inner}\n}}"


@dataclass(slots=True)
class GraphQLDocument:
    """Complete GraphQL document containing operations and fragments."""

    operations: tuple[GraphQLOperation, ...] = ()
    fragments: tuple[GraphQLFragment, ...] = ()

    def __post_init__(self) -> None:
        self._ensure_unique_operation_names()
        self._ensure_unique_fragment_names()

    def _ensure_unique_operation_names(self) -> None:
        seen: MutableMapping[str, GraphQLOperation] = {}
        for operation in self.operations:
            if operation.name is None:
                continue
            name = operation.name
            if name in seen:
                raise ValueError(
                    "duplicate operation name detected: "
                    f"{name!r} already used by {seen[name]!r}"
                )
            seen[name] = operation

    def _ensure_unique_fragment_names(self) -> None:
        seen: set[str] = set()
        for fragment in self.fragments:
            if fragment.name in seen:
                raise ValueError(f"duplicate fragment name detected: {fragment.name!r}")
            seen.add(fragment.name)

    def render(self) -> str:
        parts = [operation.render() for operation in self.operations]
        parts.extend(fragment.render() for fragment in self.fragments)
        return "\n\n".join(parts)

    def with_operation(self, operation: GraphQLOperation) -> "GraphQLDocument":
        return GraphQLDocument(operations=self.operations + (operation,), fragments=self.fragments)

    def with_fragment(self, fragment: GraphQLFragment) -> "GraphQLDocument":
        return GraphQLDocument(operations=self.operations, fragments=self.fragments + (fragment,))

    def __str__(self) -> str:  # pragma: no cover - convenience
        return self.render()


def build_query(
    selection_set: GraphQLSelectionSet,
    *,
    name: str | None = None,
    variables: Iterable[GraphQLVariable] | None = None,
    directives: Sequence[str] = (),
) -> GraphQLOperation:
    return GraphQLOperation(
        operation_type="query",
        name=name,
        selection_set=selection_set,
        variables=tuple(variables or ()),
        directives=directives,
    )


def build_mutation(
    selection_set: GraphQLSelectionSet,
    *,
    name: str | None = None,
    variables: Iterable[GraphQLVariable] | None = None,
    directives: Sequence[str] = (),
) -> GraphQLOperation:
    return GraphQLOperation(
        operation_type="mutation",
        name=name,
        selection_set=selection_set,
        variables=tuple(variables or ()),
        directives=directives,
    )


def build_subscription(
    selection_set: GraphQLSelectionSet,
    *,
    name: str | None = None,
    variables: Iterable[GraphQLVariable] | None = None,
    directives: Sequence[str] = (),
) -> GraphQLOperation:
    return GraphQLOperation(
        operation_type="subscription",
        name=name,
        selection_set=selection_set,
        variables=tuple(variables or ()),
        directives=directives,
    )
