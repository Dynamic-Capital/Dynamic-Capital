"""Multilingual corpus preprocessing pipeline for Dynamic Capital."""
from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterator, List, Sequence, Set

try:  # pragma: no cover - optional dependency for richer language ID
    from langdetect import DetectorFactory, LangDetectException, detect

    DetectorFactory.seed = 42
except ModuleNotFoundError:  # pragma: no cover - handled gracefully at runtime
    detect = None  # type: ignore
    LangDetectException = Exception  # type: ignore


THAANA_RANGE = (0x0780, 0x07BF)

DOMAIN_KEYWORDS: Dict[str, Sequence[str]] = {
    "trading": ("buy", "sell", "market", "bullish", "bearish", "signal", "entry"),
    "mentorship": ("mentor", "learning", "lesson", "guidance", "feedback", "practice"),
    "governance": ("vote", "council", "charter", "constitution", "policy", "ethics"),
}


def _contains_thaana(text: str) -> bool:
    return any(THAANA_RANGE[0] <= ord(char) <= THAANA_RANGE[1] for char in text)


def detect_language(text: str, fallback: str = "en") -> str:
    clean = text.strip()
    if not clean:
        return fallback
    if detect is not None:
        try:
            return detect(clean)
        except LangDetectException:
            pass
    if _contains_thaana(clean):
        return "dv"
    return fallback


class BloomFilter:
    """Simple Bloom filter implementation for deduplication checks."""

    def __init__(self, capacity: int, error_rate: float = 0.01) -> None:
        self.capacity = max(1, capacity)
        self.error_rate = max(min(error_rate, 0.5), 1e-6)
        size = -int(self.capacity * math.log(self.error_rate) / (math.log(2) ** 2))
        self.size = max(size, 8)
        self.num_hashes = max(int((self.size / self.capacity) * math.log(2)), 1)
        self.bits = bytearray((self.size + 7) // 8)

    def _hashes(self, text: str) -> Iterator[int]:
        encoded = text.encode("utf-8")
        for idx in range(self.num_hashes):
            value = hash((idx, encoded)) % self.size
            yield value

    def add(self, text: str) -> None:
        for value in self._hashes(text):
            self.bits[value // 8] |= 1 << (value % 8)

    def __contains__(self, text: str) -> bool:
        return all(self.bits[value // 8] & (1 << (value % 8)) for value in self._hashes(text))


class MinHashDeduper:
    """Lightweight MinHash-style deduper based on token permutations."""

    def __init__(self, permutations: int = 32) -> None:
        self.permutations = permutations
        self.seeds = [i * 2654435761 % (2**32) for i in range(permutations)]
        self._signatures: Set[tuple[int, ...]] = set()

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return re.findall(r"\w+", text.lower())

    @staticmethod
    def _hash(token: str, seed: int) -> int:
        return hash((seed, token)) & 0xFFFFFFFF

    def _signature(self, text: str) -> tuple[int, ...]:
        tokens = self._tokenize(text)
        if not tokens:
            return tuple(0 for _ in range(self.permutations))
        signature: List[int] = []
        for seed in self.seeds:
            signature.append(min(self._hash(token, seed) for token in tokens))
        return tuple(signature)

    def contains(self, text: str) -> bool:
        return self._signature(text) in self._signatures

    def add(self, text: str) -> None:
        self._signatures.add(self._signature(text))


class CorpusDeduper:
    def __init__(self, capacity: int = 250_000) -> None:
        self.bloom = BloomFilter(capacity)
        self.minhash = MinHashDeduper()

    def seen(self, text: str) -> bool:
        normalized = text.lower()
        if normalized in self.bloom and self.minhash.contains(normalized):
            return True
        self.bloom.add(normalized)
        self.minhash.add(normalized)
        return False


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def iter_input_paths(paths: Sequence[Path]) -> Iterator[Path]:
    for path in paths:
        if path.is_dir():
            yield from sorted(p for p in path.rglob("*") if p.is_file())
        else:
            yield path


@dataclass
class CorpusRecord:
    prompt: str
    response: str
    context: str
    language: str
    tags: List[str]

    def to_json(self) -> str:
        return json.dumps(
            {
                "prompt": self.prompt,
                "response": self.response,
                "context": self.context,
                "language": self.language,
                "tags": self.tags,
            },
            ensure_ascii=False,
        )


def infer_tags(prompt: str, response: str, context: str) -> List[str]:
    text = " ".join((prompt, response, context)).lower()
    tags = [name for name, keywords in DOMAIN_KEYWORDS.items() if any(keyword in text for keyword in keywords)]
    return tags or ["general"]


def parse_payload(payload: Dict[str, object]) -> Optional[CorpusRecord]:
    prompt_candidate = payload.get("prompt") or payload.get("instruction") or payload.get("input")
    response_candidate = payload.get("response") or payload.get("output") or payload.get("answer")
    context_candidate = payload.get("context") or payload.get("system") or payload.get("background")

    prompt = normalize_whitespace(str(prompt_candidate)) if prompt_candidate else ""
    response = normalize_whitespace(str(response_candidate)) if response_candidate else ""
    context = normalize_whitespace(str(context_candidate)) if context_candidate else ""

    if not prompt and response:
        prompt = "Summarise the following content with Dhivehi and English perspectives."
        context, response = response, response
    elif prompt and not response:
        response = ""

    combined = " ".join((prompt, response, context)).strip()
    if not combined:
        return None

    language = str(payload.get("language") or detect_language(combined)).lower()
    tags = infer_tags(prompt, response, context)
    return CorpusRecord(prompt=prompt, response=response, context=context, language=language, tags=tags)


def iter_corpus_records(paths: Sequence[Path]) -> Iterator[CorpusRecord]:
    for path in iter_input_paths(paths):
        if path.suffix.lower() in {".json", ".jsonl"}:
            with path.open("r", encoding="utf-8") as handle:
                for raw in handle:
                    raw = raw.strip()
                    if not raw:
                        continue
                    try:
                        payload = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(payload, dict):
                        record = parse_payload(payload)
                        if record:
                            yield record
                    elif isinstance(payload, str) and payload.strip():
                        prompt = "Translate the following passage into a mentoring response."
                        text = normalize_whitespace(payload)
                        language = detect_language(text)
                        tags = infer_tags(prompt, text, "")
                        yield CorpusRecord(prompt=prompt, response=text, context="", language=language, tags=tags)
        elif path.suffix.lower() in {".txt", ""}:
            with path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = normalize_whitespace(line)
                    if not line:
                        continue
                    prompt = "Provide bilingual mentorship advice for the following line."
                    language = detect_language(line)
                    tags = infer_tags(prompt, line, "")
                    yield CorpusRecord(prompt=prompt, response=line, context="", language=language, tags=tags)


def preprocess_corpus(
    inputs: Sequence[Path],
    output_path: Path,
    *,
    min_characters: int,
    languages: Sequence[str],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    deduper = CorpusDeduper()
    filtered_languages = {lang.lower() for lang in languages}

    with output_path.open("w", encoding="utf-8") as sink:
        for record in iter_corpus_records(inputs):
            combined = normalize_whitespace(" ".join((record.prompt, record.response, record.context)))
            if len(combined) < min_characters:
                continue
            if record.language not in filtered_languages:
                continue
            if deduper.seen(combined):
                continue
            sink.write(record.to_json() + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preprocess multilingual corpora for LLM training")
    parser.add_argument(
        "--input",
        nargs="+",
        type=Path,
        required=True,
        help="Paths to raw corpus files or directories",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Destination JSONL file compatible with the trainer service",
    )
    parser.add_argument(
        "--min-characters",
        type=int,
        default=32,
        help="Skip samples shorter than this threshold",
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        default=["en", "dv"],
        help="Allowlisted language codes",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    preprocess_corpus(
        args.input,
        args.output,
        min_characters=args.min_characters,
        languages=args.languages,
    )


if __name__ == "__main__":
    main()
