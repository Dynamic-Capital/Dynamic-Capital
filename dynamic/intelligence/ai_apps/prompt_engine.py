"""Dynamic prompt engine for composing structured LLM instructions."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from string import Formatter
from types import MappingProxyType
from typing import Any, Callable, Dict, Iterable, List, Mapping, Sequence, Tuple

__all__ = [
    "PromptMessage",
    "PromptTemplate",
    "RenderedPrompt",
    "DynamicPromptEngine",
    "MissingContextError",
    "UnknownTemplateError",
    "compose_context",
]

PromptMacro = Callable[[Mapping[str, Any]], Any | Mapping[str, Any]]


class PromptContextError(RuntimeError):
    """Base error raised for prompt context issues."""


class MissingContextError(PromptContextError):
    """Raised when required template variables are not provided."""

    def __init__(self, template: str, missing: Sequence[str]) -> None:
        missing_sorted = tuple(sorted(dict.fromkeys(missing)))
        message = \
            f"Prompt template '{template}' requires values for: {', '.join(missing_sorted)}"
        super().__init__(message)
        self.template = template
        self.missing = missing_sorted


class UnknownTemplateError(PromptContextError):
    """Raised when referencing an unknown template name."""

    def __init__(self, template: str) -> None:
        super().__init__(f"Prompt template '{template}' is not registered")
        self.template = template


@dataclass(frozen=True)
class PromptMessage:
    """Single chat message forming part of a prompt template."""

    role: str
    content: str
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.role or not self.role.strip():
            raise ValueError("PromptMessage requires a non-empty role")
        object.__setattr__(self, "role", self.role.strip())
        object.__setattr__(self, "metadata", _freeze_mapping(self.metadata))

    def as_dict(self) -> Dict[str, Any]:
        """Return the message as a serialisable payload."""

        payload: Dict[str, Any] = {"role": self.role, "content": self.content}
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(frozen=True)
class PromptTemplate:
    """Collection of messages describing a reusable prompt template."""

    name: str
    description: str = ""
    messages: Sequence[PromptMessage] = field(default_factory=tuple)
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("PromptTemplate requires a non-empty name")
        if not self.messages:
            raise ValueError("PromptTemplate requires at least one message")
        object.__setattr__(self, "name", self.name.strip())
        object.__setattr__(self, "description", self.description.strip())
        object.__setattr__(self, "messages", tuple(self.messages))
        object.__setattr__(self, "metadata", _freeze_mapping(self.metadata))
        placeholders = _extract_placeholders(self.messages)
        object.__setattr__(self, "_required_variables", tuple(sorted(placeholders)))

    @property
    def required_variables(self) -> Tuple[str, ...]:
        """Return placeholders required to render the template."""

        return self._required_variables  # type: ignore[attr-defined]

    def render(
        self,
        context: Mapping[str, Any] | None = None,
        *,
        allow_partial: bool = False,
    ) -> "RenderedPrompt":
        """Render the template using ``context`` values."""

        working_context: Dict[str, Any] = dict(context or {})
        formatter = Formatter()
        rendered_messages: List[PromptMessage] = []
        missing_keys: List[str] = []

        for message in self.messages:
            rendered, missing = _format_content(
                message.content,
                working_context,
                formatter,
                allow_partial=allow_partial,
            )
            if missing:
                missing_keys.extend(missing)
            rendered_messages.append(
                PromptMessage(role=message.role, content=rendered, metadata=message.metadata)
            )

        if missing_keys and not allow_partial:
            raise MissingContextError(self.name, missing_keys)

        return RenderedPrompt(
            template=self,
            messages=tuple(rendered_messages),
            context=MappingProxyType(dict(working_context)),
            missing_variables=tuple(sorted(dict.fromkeys(missing_keys))),
        )


@dataclass(frozen=True)
class RenderedPrompt:
    """Result of rendering a prompt template."""

    template: PromptTemplate
    messages: Tuple[PromptMessage, ...]
    context: Mapping[str, Any]
    missing_variables: Tuple[str, ...] = ()

    def to_chat_messages(self) -> List[Dict[str, str]]:
        """Return OpenAI-style chat messages."""

        return [{"role": message.role, "content": message.content} for message in self.messages]

    def to_formatted_string(
        self,
        *,
        include_roles: bool = True,
        joiner: str = "\n\n",
    ) -> str:
        """Combine messages into a single formatted string."""

        parts: List[str] = []
        for message in self.messages:
            content = message.content.strip()
            if include_roles:
                parts.append(f"{message.role}: {content}" if content else message.role)
            else:
                parts.append(content)
        return joiner.join(part for part in parts if part)

    @property
    def metadata(self) -> Mapping[str, Any]:
        """Expose template metadata for downstream tooling."""

        return self.template.metadata


class DynamicPromptEngine:
    """Registry and renderer for prompt templates with macro support."""

    def __init__(
        self,
        *,
        templates: Iterable[PromptTemplate] | None = None,
        base_context: Mapping[str, Any] | None = None,
    ) -> None:
        self._templates: Dict[str, PromptTemplate] = {}
        self._macros: "OrderedDict[str, PromptMacro]" = OrderedDict()
        self._base_context: Dict[str, Any] = dict(base_context or {})

        if templates:
            for template in templates:
                self.register_template(template)

    def register_template(self, template: PromptTemplate, *, overwrite: bool = False) -> None:
        """Register a new prompt template."""

        if template.name in self._templates and not overwrite:
            raise ValueError(f"Template '{template.name}' is already registered")
        self._templates[template.name] = template

    def remove_template(self, name: str) -> bool:
        """Remove a registered template if present."""

        return self._templates.pop(name, None) is not None

    def register_macro(self, name: str, macro: PromptMacro, *, overwrite: bool = False) -> None:
        """Register a macro that can populate missing context values."""

        if name in self._macros and not overwrite:
            raise ValueError(f"Macro '{name}' is already registered")
        self._macros[name] = macro

    def unregister_macro(self, name: str) -> bool:
        """Remove a registered macro if present."""

        return self._macros.pop(name, None) is not None

    def get_template(self, name: str) -> PromptTemplate:
        """Return a registered template or raise ``UnknownTemplateError``."""

        try:
            return self._templates[name]
        except KeyError as error:  # pragma: no cover - defensive branch
            raise UnknownTemplateError(name) from error

    def list_templates(self) -> Tuple[str, ...]:
        """Return the names of registered templates."""

        return tuple(self._templates)

    def build_prompt(
        self,
        name: str,
        *,
        context: Mapping[str, Any] | None = None,
        context_layers: Sequence[Mapping[str, Any] | None] | None = None,
        allow_partial: bool = False,
    ) -> RenderedPrompt:
        """Render the named template using the resolved context."""

        template = self.get_template(name)
        merged_context = compose_context(self._base_context, *(context_layers or ()), context or {})
        resolved_context = self._apply_macros(merged_context)
        return template.render(resolved_context, allow_partial=allow_partial)

    def preview(
        self,
        name: str,
        *,
        context: Mapping[str, Any] | None = None,
        context_layers: Sequence[Mapping[str, Any] | None] | None = None,
    ) -> str:
        """Render a preview string for a template."""

        rendered = self.build_prompt(
            name,
            context=context,
            context_layers=context_layers,
            allow_partial=True,
        )
        return rendered.to_formatted_string()

    def _apply_macros(self, context: Mapping[str, Any]) -> Dict[str, Any]:
        working: Dict[str, Any] = dict(context)
        snapshot = MappingProxyType(working)
        for name, macro in self._macros.items():
            if name in working:
                continue
            result = macro(snapshot)
            if result is None:
                continue
            if isinstance(result, Mapping):
                for key, value in result.items():
                    working.setdefault(key, value)
            else:
                working.setdefault(name, result)
            snapshot = MappingProxyType(working)
        return working


def compose_context(*layers: Mapping[str, Any] | None) -> Dict[str, Any]:
    """Merge context layers left-to-right with later entries taking precedence."""

    merged: Dict[str, Any] = {}
    for layer in layers:
        if not layer:
            continue
        for key, value in layer.items():
            merged[key] = value
    return merged


def _freeze_mapping(mapping: Mapping[str, Any] | None) -> Mapping[str, Any]:
    if not mapping:
        return MappingProxyType({})
    return MappingProxyType(dict(mapping))


def _extract_placeholders(messages: Sequence[PromptMessage]) -> set[str]:
    placeholders: set[str] = set()
    formatter = Formatter()
    for message in messages:
        for _, field_name, _, _ in formatter.parse(message.content):
            if field_name:
                root = field_name.split(".", 1)[0].split("[", 1)[0]
                if root:
                    placeholders.add(root)
    return placeholders


def _format_content(
    template: str,
    context: Mapping[str, Any],
    formatter: Formatter,
    *,
    allow_partial: bool,
) -> Tuple[str, Tuple[str, ...]]:
    parts: List[str] = []
    missing: List[str] = []

    for literal_text, field_name, format_spec, conversion in formatter.parse(template):
        parts.append(literal_text)
        if field_name is None:
            continue

        try:
            value, _ = formatter.get_field(field_name, (), context)
        except (KeyError, AttributeError, IndexError):
            root_name = field_name.split(".", 1)[0].split("[", 1)[0]
            missing.append(root_name or field_name)
            if allow_partial:
                placeholder = "{" + field_name
                if conversion:
                    placeholder += f"!{conversion}"
                if format_spec:
                    placeholder += f":{format_spec}"
                placeholder += "}"
                parts.append(placeholder)
            continue

        if conversion:
            value = formatter.convert_field(value, conversion)
        formatted = formatter.format_field(value, format_spec)
        parts.append(formatted)

    return "".join(parts), tuple(missing)
