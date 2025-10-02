"""Dhivehi language processing utilities.

The module focuses on practical natural language processing (NLP) helpers for
Dhivehi (Thaana script). It intentionally keeps runtime dependencies minimal so
that the utilities can be embedded into lightweight data or ML pipelines.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re
import unicodedata
from typing import Iterable, Iterator, Sequence

THAANA_BLOCK_START = 0x0780
THAANA_BLOCK_END = 0x07BF
_WORD_BOUNDARY_RE = re.compile(r"[\s\u200c\u200d]+")


def _is_thaana(codepoint: int) -> bool:
    """Return ``True`` when *codepoint* belongs to the Thaana Unicode block."""

    return THAANA_BLOCK_START <= codepoint <= THAANA_BLOCK_END


def detect_script(text: str) -> float:
    """Return the ratio of Thaana characters found in *text*.

    The ratio can be used as a confidence score for Dhivehi content.
    """

    if not text:
        return 0.0

    meaningful_total = 0
    thaana_count = 0
    for char in text:
        category = unicodedata.category(char)
        if category[0] not in {"L", "M", "N"}:
            continue
        meaningful_total += 1
        if _is_thaana(ord(char)):
            thaana_count += 1
    if meaningful_total == 0:
        return 0.0
    return thaana_count / meaningful_total


class DhivehiStopwords:
    """Lightweight stopword list curated from Dhivehi corpora."""

    _STOPWORDS: frozenset[str] = frozenset(
        {
            "އަށް",
            "އެ",
            "އޭ",
            "އިން",
            "އުފައް",
            "ކަމެއް",
            "ކަނޑަ",
            "ކޮންމެ",
            "ކޮމެ",
            "ކޯން",
            "ދިޔަ",
            "ދިރި",
            "ތަން",
            "ތި",
            "ތިބާ",
            "ތިޔަ",
            "ލިބޭ",
            "ގެ",
            "ގޮތް",
            "ގޮވާ",
            "ގޮތ",
            "ސައް",
            "ސާހަ",
            "ސެއް",
            "ސެން",
            "އިބޭ",
        }
    )

    @classmethod
    def contains(cls, token: str) -> bool:
        return token in cls._STOPWORDS

    @classmethod
    def remove(cls, tokens: Iterable[str]) -> list[str]:
        return [token for token in tokens if token not in cls._STOPWORDS]


@dataclass(slots=True)
class DhivehiNormalizer:
    """Perform canonical Unicode normalisation and basic cleanup."""

    preserve_punctuation: bool = False

    def normalise(self, text: str) -> str:
        canonical = unicodedata.normalize("NFC", text)
        canonical = canonical.replace("\u200d", "").replace("\u200c", "")
        if self.preserve_punctuation:
            return canonical.strip()
        cleaned_chars: list[str] = []
        for char in canonical:
            category = unicodedata.category(char)
            if category[0] in {"L", "M", "N"}:
                cleaned_chars.append(char)
            else:
                cleaned_chars.append(" ")
        cleaned = "".join(cleaned_chars)
        # Collapse multiple whitespace characters into a single space so that
        # downstream tokenisation produces stable results.
        return _WORD_BOUNDARY_RE.sub(" ", cleaned).strip()


@dataclass(slots=True)
class DhivehiTokenizer:
    """Tokenise Dhivehi text into word-like units."""

    normalizer: DhivehiNormalizer = field(default_factory=DhivehiNormalizer)

    def tokenize(self, text: str, *, drop_stopwords: bool = False) -> list[str]:
        clean = self.normalizer.normalise(text)
        if not clean:
            return []
        tokens = [token for token in _WORD_BOUNDARY_RE.split(clean) if token]
        if drop_stopwords:
            tokens = DhivehiStopwords.remove(tokens)
        return tokens


@dataclass(slots=True)
class DhivehiMorphology:
    """Very small morphological helper for surface-level analysis."""

    SUFFIXES: tuple[str, ...] = (
        "ތައް",
        "ތަކުން",
        "އަށް",
        "އެއް",
        "ކުރެ",
        "ން",
        "ތް",
        "މެއް",
        "މަށް",
        "އި",
        "އައި",
        "ގެ",
    )

    def stem(self, token: str) -> str:
        """Return a naive stem by stripping known suffixes."""

        for suffix in self.SUFFIXES:
            if token.endswith(suffix) and len(token) > len(suffix) + 1:
                return token[: -len(suffix)]
        return token

    def stems(self, tokens: Sequence[str]) -> list[str]:
        return [self.stem(token) for token in tokens]


class DhivehiTransliterator:
    """Approximate transliteration from Thaana to Latin script."""

    _MAPPING = {
        "ހ": "h",
        "ށ": "sh",
        "ނ": "n",
        "ރ": "r",
        "ބ": "b",
        "ޅ": "lh",
        "ކ": "k",
        "އ": "a",
        "ވ": "v",
        "މ": "m",
        "ފ": "f",
        "ދ": "dh",
        "ތ": "th",
        "ލ": "l",
        "ގ": "g",
        "ޏ": "gn",
        "ސ": "s",
        "ޑ": "d",
        "ޒ": "z",
        "ޓ": "t",
        "ޔ": "y",
        "ޕ": "p",
        "ޖ": "j",
        "ޗ": "ch",
        "ޘ": "tt",
        "ޙ": "hh",
        "ޚ": "kh",
        "ޛ": "dh",
        "ޜ": "z",
        "ޝ": "sh",
        "ޞ": "s",
        "ޟ": "d",
        "ޠ": "t",
        "ޡ": "z",
        "ޢ": "'",
        "ޣ": "gh",
        "ޤ": "q",
        "ޥ": "w",
        "ަ": "a",
        "ާ": "aa",
        "ި": "i",
        "ީ": "ee",
        "ު": "u",
        "ޫ": "oo",
        "ެ": "e",
        "ޭ": "ey",
        "ޮ": "o",
        "ޯ": "oa",
        "ް": "",
    }

    _TRANSLATION_TABLE = {ord(char): roman for char, roman in _MAPPING.items()}

    def transliterate(self, text: str) -> str:
        return text.translate(self._TRANSLATION_TABLE)


@dataclass(slots=True)
class DhivehiLanguageProfile:
    """Computed metadata about a Dhivehi text sample."""

    text: str
    token_count: int
    thaana_ratio: float
    average_token_length: float

    @classmethod
    def from_tokens(cls, text: str, tokens: Sequence[str]) -> "DhivehiLanguageProfile":
        token_lengths = [len(token) for token in tokens]
        avg_len = fmean(token_lengths) if token_lengths else 0.0
        return cls(
            text=text,
            token_count=len(tokens),
            thaana_ratio=detect_script(text),
            average_token_length=avg_len,
        )


def fmean(values: Sequence[int]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


@dataclass(slots=True)
class DhivehiNLPipeline:
    """Compose Dhivehi NLP helpers into a repeatable workflow."""

    normalizer: DhivehiNormalizer = field(default_factory=DhivehiNormalizer)
    tokenizer: DhivehiTokenizer | None = None
    morphology: DhivehiMorphology = field(default_factory=DhivehiMorphology)
    transliterator: DhivehiTransliterator = field(default_factory=DhivehiTransliterator)

    def __post_init__(self) -> None:
        if self.tokenizer is None:
            self.tokenizer = DhivehiTokenizer(self.normalizer)
        else:
            self.tokenizer.normalizer = self.normalizer

    def analyse(self, text: str) -> DhivehiLanguageProfile:
        tokens = self.tokenizer.tokenize(text)
        return DhivehiLanguageProfile.from_tokens(text, tokens)

    def iter_tokens(
        self, text: str, *, drop_stopwords: bool = False, stem: bool = False
    ) -> Iterator[str]:
        tokens = self.tokenizer.tokenize(text, drop_stopwords=drop_stopwords)
        if stem:
            return (self.morphology.stem(token) for token in tokens)
        return iter(tokens)

    def encode_features(
        self,
        text: str,
        *,
        drop_stopwords: bool = True,
        stem: bool = True,
    ) -> dict[str, object]:
        tokens = list(
            self.iter_tokens(text, drop_stopwords=drop_stopwords, stem=stem)
        )
        profile = self.analyse(text)
        return {
            "tokens": tokens,
            "token_count": profile.token_count,
            "average_token_length": profile.average_token_length,
            "thaana_ratio": profile.thaana_ratio,
            "transliteration": self.transliterator.transliterate(text),
        }


__all__ = [
    "DhivehiLanguageProfile",
    "DhivehiMorphology",
    "DhivehiNormalizer",
    "DhivehiNLPipeline",
    "DhivehiStopwords",
    "DhivehiTokenizer",
    "DhivehiTransliterator",
    "detect_script",
]
