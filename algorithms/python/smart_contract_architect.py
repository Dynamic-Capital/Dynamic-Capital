"""Smart contract architecture synthesis using Grok-1 and DeepSeek-V3."""

from __future__ import annotations

import json
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

from .multi_llm import CompletionClient


def _normalise_str_list(values: Any) -> List[str]:
    """Return a list of non-empty strings extracted from *values*."""

    if isinstance(values, str):
        text = values.strip()
        return [text] if text else []
    if isinstance(values, dict):
        iterable: Iterable[Any] = values.values()
    elif isinstance(values, Iterable) and not isinstance(values, (bytes, bytearray, str)):
        iterable = values
    else:
        return []

    result: List[str] = []
    for item in iterable:
        if isinstance(item, str):
            text = item.strip()
            if text:
                result.append(text)
    return result


def _extract_json(payload: str) -> Optional[Dict[str, Any]]:
    """Attempt to parse a JSON object from a free-form model response."""

    text = payload.strip()
    if not text:
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


@dataclass(slots=True)
class ModuleFunction:
    """Describes a callable entry-point within a smart contract module."""

    name: str
    description: str
    visibility: str = "public"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "visibility": self.visibility,
        }


@dataclass(slots=True)
class ArchitectureModule:
    """Collection of storage and behaviour for a contract sub-system."""

    name: str
    responsibilities: List[str] = field(default_factory=list)
    storage: List[str] = field(default_factory=list)
    functions: List[ModuleFunction] = field(default_factory=list)
    events: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "responsibilities": list(self.responsibilities),
            "storage": list(self.storage),
            "functions": [fn.to_dict() for fn in self.functions],
            "events": list(self.events),
            "dependencies": list(self.dependencies),
        }


@dataclass(slots=True)
class ArchitectureRequest:
    """Requirements captured prior to architecture synthesis."""

    objective: str
    networks: Sequence[str] = field(default_factory=tuple)
    token_standards: Sequence[str] = field(default_factory=tuple)
    participants: Sequence[str] = field(default_factory=tuple)
    throughput: Optional[str] = None
    compliance: Sequence[str] = field(default_factory=tuple)
    integration_points: Sequence[str] = field(default_factory=tuple)
    risk_tolerance: str = "balanced"

    def __post_init__(self) -> None:
        self.networks = tuple(item.strip() for item in self.networks if item)
        self.token_standards = tuple(item.strip() for item in self.token_standards if item)
        self.participants = tuple(item.strip() for item in self.participants if item)
        self.compliance = tuple(item.strip() for item in self.compliance if item)
        self.integration_points = tuple(item.strip() for item in self.integration_points if item)
        if self.throughput:
            self.throughput = self.throughput.strip()
        self.risk_tolerance = self.risk_tolerance.strip() or "balanced"

    def context_block(self) -> str:
        """Return a deterministic bullet list describing the request."""

        lines = [f"- Objective: {self.objective.strip()}"]
        if self.networks:
            lines.append("- Target networks: " + ", ".join(self.networks))
        if self.token_standards:
            lines.append("- Token standards: " + ", ".join(self.token_standards))
        if self.participants:
            lines.append("- Participants: " + ", ".join(self.participants))
        if self.integration_points:
            lines.append("- Integrations: " + ", ".join(self.integration_points))
        if self.throughput:
            lines.append(f"- Throughput goal: {self.throughput}")
        if self.compliance:
            lines.append("- Compliance: " + ", ".join(self.compliance))
        lines.append(f"- Risk tolerance: {self.risk_tolerance}")
        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "objective": self.objective,
            "networks": list(self.networks),
            "token_standards": list(self.token_standards),
            "participants": list(self.participants),
            "throughput": self.throughput,
            "compliance": list(self.compliance),
            "integration_points": list(self.integration_points),
            "risk_tolerance": self.risk_tolerance,
        }


@dataclass(slots=True)
class SmartContractArchitecture:
    """Final architecture output aggregated across both model passes."""

    request: ArchitectureRequest
    modules: List[ArchitectureModule]
    governance: str
    upgradeability: str
    offchain_services: List[str]
    threat_model: List[str]
    mitigations: List[str]
    monitoring: List[str]
    testing: List[str]
    compliance: List[str]
    notes: List[str]
    raw_outline: str
    raw_security_review: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request": self.request.to_dict(),
            "modules": [module.to_dict() for module in self.modules],
            "governance": self.governance,
            "upgradeability": self.upgradeability,
            "offchain_services": list(self.offchain_services),
            "threat_model": list(self.threat_model),
            "mitigations": list(self.mitigations),
            "monitoring": list(self.monitoring),
            "testing": list(self.testing),
            "compliance": list(self.compliance),
            "notes": list(self.notes),
            "raw_outline": self.raw_outline,
            "raw_security_review": self.raw_security_review,
        }


@dataclass(slots=True)
class SmartContractArchitect:
    """Coordinates Grok-1 and DeepSeek-V3 to propose an architecture."""

    grok_client: CompletionClient
    deepseek_client: CompletionClient
    outline_temperature: float = 0.2
    outline_max_tokens: int = 512
    outline_nucleus_p: float = 0.9
    security_temperature: float = 0.15
    security_max_tokens: int = 512
    security_nucleus_p: float = 0.9

    def design(self, request: ArchitectureRequest) -> SmartContractArchitecture:
        outline_prompt = self._build_outline_prompt(request)
        outline_raw = self.grok_client.complete(
            outline_prompt,
            temperature=self.outline_temperature,
            max_tokens=self.outline_max_tokens,
            nucleus_p=self.outline_nucleus_p,
        )
        outline_payload = self._parse_outline(outline_raw)

        security_prompt = self._build_security_prompt(request, outline_payload)
        security_raw = self.deepseek_client.complete(
            security_prompt,
            temperature=self.security_temperature,
            max_tokens=self.security_max_tokens,
            nucleus_p=self.security_nucleus_p,
        )
        security_payload = self._parse_security_review(security_raw)

        return self._build_architecture(
            request=request,
            outline=outline_payload,
            security=security_payload,
            raw_outline=outline_raw,
            raw_security=security_raw,
        )

    def _build_outline_prompt(self, request: ArchitectureRequest) -> str:
        return (
            "You are Grok-1, acting as the protocol architect for a new on-chain system.\n"
            "Draft a modular smart-contract architecture using concise JSON.\n"
            "The schema must be: {\"modules\": [\"name\": str, \"responsibilities\": [str], \"storage\": [str],"
            " \"functions\": [{\"name\": str, \"description\": str, \"visibility\": str}], \"events\": [str],"
            " \"dependencies\": [str]], \"governance\": str, \"upgradeability\": str, \"offchain_services\": [str],"
            " \"notes\": [str]}\n"
            "Ensure storage layouts highlight state variable groupings and mention cross-chain messaging where relevant.\n"
            "Design assumptions:\n"
            f"{request.context_block()}\n"
            "Respond with only minified JSON."
        )

    def _build_security_prompt(self, request: ArchitectureRequest, outline: Dict[str, Any]) -> str:
        modules = outline.get("modules", [])
        module_names: List[str] = []
        for module in modules:
            if isinstance(module, ArchitectureModule):
                module_names.append(module.name)
            elif isinstance(module, dict):
                module_names.append(str(module.get("name") or "").strip())
            else:
                module_names.append(str(module))
        module_summary = ", ".join(name for name in module_names if name)
        summary_lines = ["- Modules: " + (module_summary or "unspecified")]
        governance = outline.get("governance") or ""
        upgradeability = outline.get("upgradeability") or ""
        if governance:
            summary_lines.append(f"- Governance: {governance}")
        if upgradeability:
            summary_lines.append(f"- Upgrade pattern: {upgradeability}")
        offchain = outline.get("offchain_services") or []
        if offchain:
            summary_lines.append("- Off-chain services: " + ", ".join(str(item) for item in offchain))
        summary_lines.append(f"- Risk tolerance: {request.risk_tolerance}")
        summary_lines.append("- Compliance: " + (", ".join(request.compliance) if request.compliance else "general best practices"))

        return (
            "You are DeepSeek-V3 performing protocol security and delivery assurance.\n"
            "Review the proposed architecture and produce JSON with keys:\n"
            "{\"threats\": [str], \"mitigations\": [str], \"monitoring\": [str], \"testing\": [str],"
            " \"compliance\": [str], \"notes\": [str], \"upgradeability\": str}.\n"
            "Highlight compliance controls aligned to the described jurisdictions.\n"
            "Architecture summary:\n"
            f"{chr(10).join(summary_lines)}\n"
            "Respond with machine-readable JSON only."
        )

    def _parse_outline(self, response: str) -> Dict[str, Any]:
        parsed = _extract_json(response) or {}
        modules_payload = []
        raw_modules = parsed.get("modules")
        if isinstance(raw_modules, dict):
            raw_iterable: Iterable[Any] = [raw_modules]
        elif isinstance(raw_modules, Iterable) and not isinstance(raw_modules, (bytes, bytearray, str)):
            raw_iterable = raw_modules
        else:
            raw_iterable = []

        for item in raw_iterable:
            if not isinstance(item, dict):
                continue
            module = ArchitectureModule(
                name=str(item.get("name") or "Unnamed Module").strip(),
                responsibilities=_normalise_str_list(item.get("responsibilities")),
                storage=_normalise_str_list(item.get("storage") or item.get("state")),
                functions=self._parse_functions(item.get("functions")),
                events=_normalise_str_list(item.get("events")),
                dependencies=_normalise_str_list(item.get("dependencies") or item.get("integrations")),
            )
            modules_payload.append(module)
        governance = str(parsed.get("governance") or parsed.get("governance_model") or "").strip()
        upgradeability = str(parsed.get("upgradeability") or parsed.get("upgrade_pattern") or "").strip()
        offchain_services = _normalise_str_list(
            parsed.get("offchain_services") or parsed.get("offchain") or parsed.get("off_chain")
        )
        notes = _normalise_str_list(parsed.get("notes") or parsed.get("rationale") or parsed.get("considerations"))
        if not modules_payload and response.strip():
            notes = notes or [response.strip()]
        return {
            "modules": modules_payload,
            "governance": governance,
            "upgradeability": upgradeability,
            "offchain_services": offchain_services,
            "notes": notes,
        }

    def _parse_functions(self, payload: Any) -> List[ModuleFunction]:
        if isinstance(payload, dict):
            items: Iterable[Any] = [payload]
        elif isinstance(payload, Iterable) and not isinstance(payload, (bytes, bytearray, str)):
            items = payload
        else:
            return []
        functions: List[ModuleFunction] = []
        for item in items:
            if isinstance(item, dict):
                name = str(item.get("name") or "function").strip()
                description = str(item.get("description") or "").strip()
                visibility = str(item.get("visibility") or "public").strip() or "public"
            else:
                name = str(item).strip() or "function"
                description = ""
                visibility = "public"
            functions.append(ModuleFunction(name=name, description=description, visibility=visibility))
        return functions

    def _parse_security_review(self, response: str) -> Dict[str, Any]:
        parsed = _extract_json(response) or {}
        threats = _normalise_str_list(parsed.get("threats"))
        mitigations = _normalise_str_list(parsed.get("mitigations"))
        monitoring = _normalise_str_list(parsed.get("monitoring"))
        testing = _normalise_str_list(parsed.get("testing"))
        compliance = _normalise_str_list(parsed.get("compliance"))
        notes = _normalise_str_list(parsed.get("notes"))
        upgradeability = str(parsed.get("upgradeability") or "").strip()
        if not any([threats, mitigations, monitoring, testing, compliance, notes]) and response.strip():
            notes = [response.strip()]
        return {
            "threats": threats,
            "mitigations": mitigations,
            "monitoring": monitoring,
            "testing": testing,
            "compliance": compliance,
            "notes": notes,
            "upgradeability": upgradeability,
        }

    def _build_architecture(
        self,
        *,
        request: ArchitectureRequest,
        outline: Dict[str, Any],
        security: Dict[str, Any],
        raw_outline: str,
        raw_security: str,
    ) -> SmartContractArchitecture:
        modules = outline.get("modules") or []
        governance = outline.get("governance") or security.get("governance") or ""
        upgradeability = outline.get("upgradeability") or security.get("upgradeability") or ""
        offchain_services = outline.get("offchain_services") or []
        threat_model = security.get("threats") or []
        mitigations = security.get("mitigations") or []
        monitoring = security.get("monitoring") or []
        testing = security.get("testing") or []
        compliance = security.get("compliance") or []
        notes = (outline.get("notes") or []) + (security.get("notes") or [])
        return SmartContractArchitecture(
            request=request,
            modules=list(modules),
            governance=governance,
            upgradeability=upgradeability,
            offchain_services=list(offchain_services),
            threat_model=list(threat_model),
            mitigations=list(mitigations),
            monitoring=list(monitoring),
            testing=list(testing),
            compliance=list(compliance),
            notes=list(notes),
            raw_outline=raw_outline,
            raw_security_review=raw_security,
        )


__all__ = [
    "ArchitectureModule",
    "ArchitectureRequest",
    "ModuleFunction",
    "SmartContractArchitect",
    "SmartContractArchitecture",
]
