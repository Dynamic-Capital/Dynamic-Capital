from __future__ import annotations

"""In-memory TF-IDF search engine with support for dynamic document updates."""

from collections import Counter, defaultdict
from heapq import nlargest
from dataclasses import dataclass
from math import log, sqrt
from typing import Callable, Iterable, Mapping
from types import MappingProxyType

__all__ = ["Document", "SearchResult", "DynamicSearchEngine"]


@dataclass(frozen=True)
class Document:
    """Structured container for searchable content."""

    identifier: str
    content: str
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        identifier = self.identifier.strip()
        if not identifier:
            raise ValueError("document identifier must not be empty")
        content = self.content.strip()
        if not content:
            raise ValueError("document content must not be empty")
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "content", content)
        if self.metadata is not None:
            metadata = MappingProxyType(dict(self.metadata))
            object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True)
class SearchResult:
    """Search result bundle combining the document and its relevance score."""

    document: Document
    score: float
    snippet: str | None = None


class DynamicSearchEngine:
    """Small TF-IDF engine optimised for low-latency, in-memory queries."""

    def __init__(self, *, tokenizer: Callable[[str], Iterable[str]] | None = None) -> None:
        self._documents: dict[str, Document] = {}
        self._doc_term_frequencies: dict[str, Counter[str]] = {}
        self._doc_lengths: dict[str, int] = {}
        self._doc_term_weights: dict[str, dict[str, float]] = {}
        self._inverted_index: dict[str, dict[str, int]] = defaultdict(dict)
        self._tokenizer = tokenizer or self._default_tokenizer

    @staticmethod
    def _default_tokenizer(text: str) -> Iterable[str]:
        token = []
        for char in text.lower():
            if char.isalnum():
                token.append(char)
            else:
                if token:
                    yield "".join(token)
                    token.clear()
        if token:
            yield "".join(token)

    def add_document(self, document: Document) -> None:
        self.add_documents([document])

    def add_documents(self, documents: Iterable[Document]) -> None:
        for document in documents:
            identifier = document.identifier
            if identifier in self._documents:
                self.remove_document(identifier)

            tokens = list(self._tokenizer(document.content))
            if not tokens:
                continue

            term_frequencies = Counter(tokens)
            document_length = len(tokens)
            normaliser = float(document_length) or 1.0
            term_weights = {
                term: frequency / normaliser for term, frequency in term_frequencies.items()
            }
            self._documents[identifier] = document
            self._doc_term_frequencies[identifier] = term_frequencies
            self._doc_lengths[identifier] = document_length
            self._doc_term_weights[identifier] = term_weights

            for term, frequency in term_frequencies.items():
                self._inverted_index[term][identifier] = frequency

    def remove_document(self, identifier: str) -> bool:
        if identifier not in self._documents:
            return False

        term_frequencies = self._doc_term_frequencies.pop(identifier)
        for term in list(term_frequencies):
            postings = self._inverted_index.get(term)
            if postings is None:
                continue
            postings.pop(identifier, None)
            if not postings:
                self._inverted_index.pop(term, None)

        self._documents.pop(identifier, None)
        self._doc_lengths.pop(identifier, None)
        self._doc_term_weights.pop(identifier, None)
        return True

    def get_document(self, identifier: str) -> Document | None:
        return self._documents.get(identifier)

    def clear(self) -> None:
        self._documents.clear()
        self._doc_term_frequencies.clear()
        self._doc_lengths.clear()
        self._doc_term_weights.clear()
        self._inverted_index.clear()

    def search(
        self,
        query: str,
        *,
        limit: int = 10,
        filter: Callable[[Document], bool] | None = None,
    ) -> list[SearchResult]:
        if limit <= 0:
            return []

        query = query.strip()
        if not query or not self._documents:
            return []

        query_tokens = [token for token in self._tokenizer(query) if token]
        if not query_tokens:
            return []

        query_term_frequencies = Counter(query_tokens)
        query_length = len(query_tokens)
        doc_scores: dict[str, float] = defaultdict(float)
        total_documents = len(self._documents)
        idf_cache: dict[str, float] = {}

        def idf(term: str) -> float:
            if term not in idf_cache:
                doc_frequency = len(self._inverted_index.get(term, {}))
                idf_cache[term] = log((1 + total_documents) / (1 + doc_frequency)) + 1.0
            return idf_cache[term]

        for term, query_frequency in query_term_frequencies.items():
            postings = self._inverted_index.get(term)
            if not postings:
                continue
            inverse_document_frequency = idf(term)
            query_weight = (query_frequency / query_length) * inverse_document_frequency
            for identifier, frequency in postings.items():
                document_length = self._doc_lengths.get(identifier, 1) or 1
                document_weight = (frequency / document_length) * inverse_document_frequency
                doc_scores[identifier] += document_weight * query_weight

        if not doc_scores:
            return []

        query_norm = sqrt(
            sum(
                ((freq / query_length) * idf(term)) ** 2
                for term, freq in query_term_frequencies.items()
            )
        ) or 1.0

        candidates: list[tuple[str, float, Document]] = []
        for identifier, raw_score in doc_scores.items():
            document = self._documents[identifier]
            if filter and not filter(document):
                continue

            norm = self._compute_document_norm(identifier, idf)
            if norm == 0:
                continue
            score = raw_score / (norm * query_norm)
            if score <= 0:
                continue
            candidates.append((identifier, score, document))

        if not candidates:
            return []

        if len(candidates) > limit:
            top_candidates = nlargest(limit, candidates, key=lambda item: item[1])
        else:
            top_candidates = sorted(candidates, key=lambda item: item[1], reverse=True)

        results: list[SearchResult] = []
        for identifier, score, document in top_candidates:
            snippet = self._build_snippet(document.content, query_term_frequencies)
            results.append(SearchResult(document=document, score=score, snippet=snippet))

        return results

    def _compute_document_norm(self, identifier: str, idf: Callable[[str], float]) -> float:
        term_weights = self._doc_term_weights.get(identifier)
        if not term_weights:
            return 0.0
        total = 0.0
        for term, weight in term_weights.items():
            weight *= idf(term)
            total += weight * weight
        return sqrt(total)

    @staticmethod
    def _build_snippet(content: str, query_terms: Mapping[str, int]) -> str | None:
        lower_content = content.lower()
        best_index = len(content)
        selected_term: str | None = None
        for term in query_terms:
            index = lower_content.find(term)
            if index != -1 and index < best_index:
                best_index = index
                selected_term = term
        if selected_term is None:
            return None

        start = max(best_index - 40, 0)
        end = min(best_index + 60, len(content))
        snippet = content[start:end].strip()
        return snippet or None
