"""Dynamic multi-LLM workflow for assembling project FAQs."""

from __future__ import annotations

import json
import textwrap
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import (
    CompletionClient,
    LLMConfig,
    LLMRun,
    collect_strings,
    parse_json_response,
    serialise_runs,
)


@dataclass(slots=True)
class FAQSource:
    """Represents a supplemental knowledge base document."""

    title: str
    content: str


@dataclass(slots=True)
class FAQRequest:
    """Input payload describing the project and FAQ requirements."""

    project_name: str
    project_summary: str
    target_audience: Sequence[str] = field(default_factory=tuple)
    differentiators: Sequence[str] = field(default_factory=tuple)
    objectives: Sequence[str] = field(default_factory=tuple)
    tone: str = "confident and clear"
    sources: Sequence[FAQSource] = field(default_factory=tuple)
    existing_faq: Mapping[str, str] = field(default_factory=dict)
    seed_questions: Sequence[str] = field(default_factory=tuple)
    priority_topics: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class FAQDraftQuestion:
    """Intermediate question payload returned by the ideation model."""

    question: str
    audience: Optional[str] = None
    intent: Optional[str] = None
    tags: Sequence[str] = field(default_factory=tuple)
    priority: Optional[float] = None


@dataclass(slots=True)
class FAQEntry:
    """Structured FAQ entry ready for publication."""

    question: str
    answer: str
    tags: list[str] = field(default_factory=list)
    audience: Optional[str] = None
    source_notes: list[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"question": self.question, "answer": self.answer}
        if self.tags:
            payload["tags"] = list(self.tags)
        if self.audience:
            payload["audience"] = self.audience
        if self.source_notes:
            payload["source_notes"] = list(self.source_notes)
        return payload


@dataclass(slots=True)
class ProjectFAQPackage:
    """Final artefact returned by :class:`ProjectFAQGenerator`."""

    entries: list[FAQEntry]
    summary: Optional[str]
    callouts: list[str]
    metadata: Dict[str, Any]
    runs: Sequence[LLMRun]
    raw_response: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "faqs": [entry.to_dict() for entry in self.entries],
            "callouts": list(self.callouts),
            "metadata": self.metadata,
        }
        if self.summary:
            payload["summary"] = self.summary
        if self.raw_response:
            payload["raw_response"] = self.raw_response
        return payload


@dataclass(slots=True)
class ProjectFAQGenerator:
    """Coordinates specialised LLMs to produce project FAQs."""

    ideation: LLMConfig
    answer: LLMConfig
    review: Optional[LLMConfig] = None
    max_questions: int = 12
    source_character_limit: int = 1200

    def generate(self, request: FAQRequest) -> ProjectFAQPackage:
        """Return a curated FAQ package for the supplied project request."""

        runs: list[LLMRun] = []
        metadata: Dict[str, Any] = {
            "project_name": request.project_name,
            "target_audience": list(request.target_audience),
            "differentiators": list(request.differentiators),
            "objectives": list(request.objectives),
        }

        entries = self._initialise_existing_entries(request)
        metadata["existing_faq_count"] = len(entries)

        context_note = self._build_context_note(request)
        ideation_prompt = self._build_ideation_prompt(request, context_note)
        ideation_run = self.ideation.run(ideation_prompt)
        runs.append(ideation_run)

        ideation_payload = parse_json_response(ideation_run.response, fallback_key="analysis") or {}
        metadata["ideation_payload"] = ideation_payload

        draft_questions = self._normalise_questions(ideation_payload, request)
        metadata["candidate_questions"] = [asdict(q) for q in draft_questions]

        answer_payloads: list[Dict[str, Any]] = []
        answered_questions = {entry.question.lower(): entry for entry in entries}

        for draft in draft_questions:
            if len(entries) >= self.max_questions:
                break
            question_key = draft.question.strip().lower()
            if not question_key or question_key in answered_questions:
                continue

            answer_prompt = self._build_answer_prompt(request, draft, context_note)
            answer_run = self.answer.run(answer_prompt)
            runs.append(answer_run)

            payload = parse_json_response(answer_run.response, fallback_key="answer") or {}
            answer_payloads.append(payload)

            answer_text = self._resolve_answer_text(payload)
            tags = collect_strings(draft.tags, payload.get("tags"))
            audience = draft.audience or payload.get("audience")

            entries.append(
                FAQEntry(
                    question=draft.question.strip(),
                    answer=answer_text,
                    tags=list(tags),
                    audience=audience.strip() if isinstance(audience, str) else audience,
                    source_notes=self._derive_source_notes(payload, request),
                )
            )
            answered_questions[question_key] = entries[-1]

        metadata["answer_payloads"] = answer_payloads

        summary = self._resolve_summary(ideation_payload)
        callouts = collect_strings(ideation_payload.get("callouts"))

        if self.review and entries:
            review_prompt = self._build_review_prompt(request, entries, context_note)
            review_run = self.review.run(review_prompt)
            runs.append(review_run)

            review_payload = parse_json_response(review_run.response, fallback_key="review_notes") or {}
            metadata["review_payload"] = review_payload

            updated_entries, review_summary, review_callouts = self._apply_review(entries, review_payload)
            entries = updated_entries
            if review_summary:
                summary = review_summary
            if review_callouts:
                callouts = review_callouts

        raw_response = serialise_runs(runs)
        package_metadata = {
            **metadata,
            "context_note": context_note,
            "question_count": len(entries),
        }

        return ProjectFAQPackage(
            entries=entries,
            summary=summary,
            callouts=list(callouts),
            metadata=package_metadata,
            runs=runs,
            raw_response=raw_response,
        )

    def _initialise_existing_entries(self, request: FAQRequest) -> list[FAQEntry]:
        entries: list[FAQEntry] = []
        for question, answer in request.existing_faq.items():
            question_text = question.strip()
            answer_text = answer.strip()
            if not question_text or not answer_text:
                continue
            entries.append(
                FAQEntry(
                    question=question_text,
                    answer=answer_text,
                    source_notes=["Provided in existing FAQ"],
                )
            )
        return entries

    def _build_context_note(self, request: FAQRequest) -> str:
        sections = [
            f"Project: {request.project_name.strip()}",
            f"Voice and tone: {request.tone.strip()}",
        ]

        if request.target_audience:
            sections.append("Primary audiences: " + ", ".join(request.target_audience))
        if request.objectives:
            sections.append("Launch objectives: " + ", ".join(request.objectives))
        if request.differentiators:
            sections.append("Key differentiators: " + ", ".join(request.differentiators))
        if request.priority_topics:
            sections.append("Priority topics: " + ", ".join(request.priority_topics))

        return " | ".join(sections)

    def _build_ideation_prompt(self, request: FAQRequest, context_note: str) -> str:
        source_digest = self._compile_source_digest(request.sources)
        existing_questions = list(request.existing_faq.keys())
        seed_questions = list(request.seed_questions)

        payload = {
            "summary": request.project_summary,
            "existing_questions": existing_questions,
            "seed_questions": seed_questions,
            "target_audience": list(request.target_audience),
            "differentiators": list(request.differentiators),
            "objectives": list(request.objectives),
            "priority_topics": list(request.priority_topics),
        }

        payload_json = json.dumps(payload, indent=2, default=str, sort_keys=True)

        return textwrap.dedent(
            f"""
            You are a product strategist collaborating with Dynamic Capital's leadership.
            Design a comprehensive FAQ outline for the project described below. Blend
            business positioning, product mechanics, compliance signals, and onboarding
            clarity. Return a single JSON object with:
              - "questions": array of objects with fields "question", optional "audience",
                optional "intent", optional "tags", and optional "priority" (0-1 score).
              - "summary": optional executive summary of the FAQ coverage.
              - "callouts": optional array of critical highlights or caveats.
            Avoid duplicate or trivial questions and honour the requested tone.

            Context note: {context_note}

            Project dossier:
            {payload_json}

            Supplemental knowledge base:
            {source_digest}
            """
        ).strip()

    def _build_answer_prompt(
        self,
        request: FAQRequest,
        draft: FAQDraftQuestion,
        context_note: str,
    ) -> str:
        source_digest = self._compile_source_digest(request.sources)
        payload = {
            "question": draft.question,
            "project_summary": request.project_summary,
            "audience": draft.audience or request.target_audience,
            "intent": draft.intent,
            "differentiators": list(request.differentiators),
            "objectives": list(request.objectives),
            "priority_topics": list(request.priority_topics),
        }
        payload_json = json.dumps(payload, indent=2, default=str, sort_keys=True)

        return textwrap.dedent(
            f"""
            You are the documentation lead for Dynamic Capital. Draft a crisp FAQ answer
            for the provided question. Use the supplied project dossier and knowledge base
            excerpts. Respond with JSON containing:
              - "answer": authoritative yet friendly answer (markdown allowed).
              - "tags": optional array of topical tags.
              - "audience": optional refined audience label.
              - "source_notes": optional array referencing which inputs you used.
            Keep the answer concise, factual, and aligned with the stated tone.

            Context note: {context_note}

            FAQ payload:
            {payload_json}

            Knowledge base:
            {source_digest}
            """
        ).strip()

    def _build_review_prompt(
        self,
        request: FAQRequest,
        entries: Sequence[FAQEntry],
        context_note: str,
    ) -> str:
        payload = {
            "faqs": [entry.to_dict() for entry in entries],
            "project_summary": request.project_summary,
            "target_audience": list(request.target_audience),
            "tone": request.tone,
        }
        payload_json = json.dumps(payload, indent=2, default=str, sort_keys=True)

        return textwrap.dedent(
            f"""
            You are the editorial director ensuring FAQ consistency for Dynamic Capital.
            Review the drafted entries for tone, coverage, and regulatory alignment. If
            improvements are needed, update the answers. Return JSON with:
              - "faqs": array of entries mirroring the input structure (question, answer,
                optional "tags", optional "audience", optional "source_notes").
              - "summary": optional executive digest.
              - "callouts": optional array of caveats or follow-up actions.
            If everything is solid, echo the entries unchanged. Do not add commentary
            outside the JSON structure.

            Context note: {context_note}

            Draft FAQ package:
            {payload_json}
            """
        ).strip()

    def _compile_source_digest(self, sources: Sequence[FAQSource]) -> str:
        if not sources:
            return "(No additional documents provided.)"

        sections = []
        for source in sources:
            content = source.content.strip()
            if len(content) > self.source_character_limit:
                content = content[: self.source_character_limit].rstrip() + " …"
            sections.append(f"### {source.title}\n{content}")
        return "\n\n".join(sections)

    def _normalise_questions(self, payload: Mapping[str, Any], request: FAQRequest) -> list[FAQDraftQuestion]:
        raw_questions = payload.get("questions")
        draft_questions: list[FAQDraftQuestion] = []
        seen: set[str] = {question.lower() for question in request.existing_faq.keys()}

        def _append(question: str, **kwargs: Any) -> None:
            key = question.strip().lower()
            if not key or key in seen:
                return
            seen.add(key)
            draft_questions.append(FAQDraftQuestion(question=question.strip(), **kwargs))

        if isinstance(raw_questions, Mapping):
            raw_questions = raw_questions.get("items")

        if isinstance(raw_questions, Iterable):
            for item in raw_questions:
                if isinstance(item, Mapping):
                    question_text = str(item.get("question") or "").strip()
                    if not question_text:
                        continue
                    _append(
                        question_text,
                        audience=item.get("audience"),
                        intent=item.get("intent"),
                        tags=tuple(collect_strings(item.get("tags"))),
                        priority=self._safe_float(item.get("priority")),
                    )
                elif isinstance(item, str):
                    _append(item)

        for seed in request.seed_questions:
            _append(str(seed))

        for topic in request.priority_topics:
            topic_question = str(topic).strip()
            if not topic_question:
                continue
            if not topic_question.endswith("?"):
                topic_question += "?"
            _append(topic_question)

        draft_questions.sort(key=lambda q: (-(q.priority or 0.0), q.question))
        return draft_questions[: self.max_questions]

    def _safe_float(self, value: Any) -> Optional[float]:
        try:
            if value is None:
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    def _resolve_answer_text(self, payload: Mapping[str, Any]) -> str:
        for key in ("answer", "response", "text", "narrative", "content"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    def _derive_source_notes(self, payload: Mapping[str, Any], request: FAQRequest) -> list[str]:
        notes = collect_strings(payload.get("source_notes"))
        if notes:
            return list(notes)
        if not request.sources:
            return []
        return [source.title for source in request.sources]

    def _resolve_summary(self, payload: Mapping[str, Any]) -> Optional[str]:
        summary = payload.get("summary")
        if isinstance(summary, str) and summary.strip():
            return summary.strip()
        return None

    def _apply_review(
        self,
        entries: Sequence[FAQEntry],
        payload: Mapping[str, Any],
    ) -> tuple[list[FAQEntry], Optional[str], list[str]]:
        faqs_payload = payload.get("faqs")
        if isinstance(faqs_payload, Iterable):
            reviewed_entries: list[FAQEntry] = []
            for item in faqs_payload:
                if isinstance(item, Mapping):
                    question = str(item.get("question") or "").strip()
                    answer = str(item.get("answer") or "").strip()
                    if not question or not answer:
                        continue
                    reviewed_entries.append(
                        FAQEntry(
                            question=question,
                            answer=answer,
                            tags=list(collect_strings(item.get("tags"))),
                            audience=(
                                str(item.get("audience")).strip()
                                if item.get("audience") is not None
                                else None
                            ),
                            source_notes=list(collect_strings(item.get("source_notes"))),
                        )
                    )
            if reviewed_entries:
                entries = reviewed_entries

        summary = payload.get("summary")
        summary_text = summary.strip() if isinstance(summary, str) and summary.strip() else None
        callouts = collect_strings(payload.get("callouts"))

        return list(entries), summary_text, list(callouts)


__all__ = [
    "FAQSource",
    "FAQRequest",
    "FAQDraftQuestion",
    "FAQEntry",
    "ProjectFAQPackage",
    "ProjectFAQGenerator",
]
