"""Knowledge engine and graph orchestration utilities for Dynamic AI."""

from __future__ import annotations

import re
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence, Tuple


def _normalise_tag(tag: str) -> str:
    """Return a canonical representation of a tag string."""

    clean = re.sub(r"[^a-z0-9]+", "-", tag.strip().lower())
    clean = clean.strip("-")
    return clean or tag.strip().lower()


def _tokenise(text: str) -> List[str]:
    """Tokenise free-form text into lowercase alphanumeric terms."""

    return re.findall(r"[a-z0-9_]+", text.lower())


@dataclass
class KnowledgeSource:
    """Represents the provenance of a knowledge artefact."""

    name: str
    reference: str
    credibility: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeNode:
    """A single concept tracked in the knowledge graph."""

    identifier: str
    title: str
    summary: str
    tags: Tuple[str, ...] = ()
    sources: Tuple[KnowledgeSource, ...] = ()
    metadata: Dict[str, Any] = field(default_factory=dict)

    def importance(self) -> float:
        """Return the relative importance score of the node."""

        priority = self.metadata.get("priority")
        if isinstance(priority, (int, float)):
            return max(0.1, float(priority))
        return 1.0

    def key_terms(self) -> Tuple[str, ...]:
        """Return unique key terms derived from the node metadata."""

        tokens: List[str] = []
        tokens.extend(self.tags)
        tokens.extend(_tokenise(self.title))
        tokens.extend(_tokenise(self.summary))

        seen: set[str] = set()
        ordered: List[str] = []
        for token in tokens:
            if not token:
                continue
            if token not in seen:
                seen.add(token)
                ordered.append(token)
        return tuple(ordered)

    def merge(self, other: "KnowledgeNode") -> "KnowledgeNode":
        """Merge another node with the same identifier into this one."""

        if other.identifier != self.identifier:
            raise ValueError("Cannot merge nodes with different identifiers")

        if other.title and other.title != self.title:
            aliases = set(self.metadata.get("aliases", []))
            aliases.add(other.title)
            self.metadata["aliases"] = sorted(aliases)

        if other.summary and len(other.summary) > len(self.summary):
            self.summary = other.summary

        self.tags = tuple(sorted(set(self.tags) | set(other.tags)))

        existing_sources = {(src.name.lower(), src.reference): src for src in self.sources}
        for source in other.sources:
            existing_sources[(source.name.lower(), source.reference)] = source
        self.sources = tuple(existing_sources.values())

        self.metadata.update({key: value for key, value in other.metadata.items() if value is not None})
        return self


@dataclass
class KnowledgeEdge:
    """Directed relationship between two knowledge nodes."""

    source: str
    target: str
    relation: str
    weight: float = 1.0
    rationale: str = ""
    tags: Tuple[str, ...] = ()
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RelationHint:
    """Ingestion hint describing a desired relationship."""

    target: str
    relation: str
    weight: float = 1.0
    rationale: str = ""
    tags: Tuple[str, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass
class KnowledgeEntry:
    """Structured payload used to ingest a concept into the graph."""

    identifier: str
    title: str
    content: str
    tags: Sequence[str] = field(default_factory=tuple)
    sources: Sequence[KnowledgeSource] = field(default_factory=tuple)
    metadata: Dict[str, Any] = field(default_factory=dict)
    relations: Sequence[RelationHint] = field(default_factory=tuple)


@dataclass
class KnowledgeSearchHit:
    """Result returned by a knowledge graph query."""

    node: KnowledgeNode
    score: float
    matched_terms: Tuple[str, ...]
    tag_overlap: Tuple[str, ...]


@dataclass
class LinkRecommendation:
    """Recommended linkage between two knowledge nodes."""

    source: KnowledgeNode
    target: KnowledgeNode
    score: float
    shared_tags: Tuple[str, ...]
    rationale: str


@dataclass
class KnowledgeGraphSnapshot:
    """Light-weight view of a subgraph."""

    nodes: Dict[str, KnowledgeNode]
    edges: Tuple[KnowledgeEdge, ...]

    def adjacency(self) -> Dict[str, List[Tuple[str, str]]]:
        """Return an adjacency list representation of the snapshot."""

        adjacency: Dict[str, List[Tuple[str, str]]] = {identifier: [] for identifier in self.nodes}
        for edge in self.edges:
            if edge.source in adjacency:
                adjacency[edge.source].append((edge.target, edge.relation))
        return adjacency


class KnowledgeGraph:
    """In-memory directed knowledge graph with typed nodes and edges."""

    def __init__(self) -> None:
        self.nodes: Dict[str, KnowledgeNode] = {}
        self._edges_by_key: Dict[Tuple[str, str, str], KnowledgeEdge] = {}
        self._outbound: Dict[str, List[KnowledgeEdge]] = defaultdict(list)
        self._inbound: Dict[str, List[KnowledgeEdge]] = defaultdict(list)

    def add_node(self, node: KnowledgeNode) -> KnowledgeNode:
        """Insert or merge a knowledge node."""

        existing = self.nodes.get(node.identifier)
        if existing is None:
            self.nodes[node.identifier] = node
            return node

        return existing.merge(node)

    def has_edge(self, source: str, target: str, relation: Optional[str] = None) -> bool:
        """Return whether an edge already exists between two nodes."""

        if relation is not None:
            return (source, target, relation) in self._edges_by_key
        return any(key[0] == source and key[1] == target for key in self._edges_by_key)

    def add_edge(self, edge: KnowledgeEdge) -> KnowledgeEdge:
        """Insert or merge a directed edge."""

        if edge.source not in self.nodes:
            raise KeyError(f"Unknown source node '{edge.source}'")
        if edge.target not in self.nodes:
            raise KeyError(f"Unknown target node '{edge.target}'")

        key = (edge.source, edge.target, edge.relation)
        existing = self._edges_by_key.get(key)
        if existing is None:
            self._edges_by_key[key] = edge
            self._outbound[edge.source].append(edge)
            self._inbound[edge.target].append(edge)
            return edge

        existing.weight = max(existing.weight, edge.weight)
        if edge.rationale and edge.rationale not in existing.rationale:
            if existing.rationale:
                existing.rationale = f"{existing.rationale} {edge.rationale}".strip()
            else:
                existing.rationale = edge.rationale
        existing.tags = tuple(sorted(set(existing.tags) | set(edge.tags)))
        existing.metadata.update(edge.metadata)
        return existing

    def link(
        self,
        source: str,
        target: str,
        relation: str,
        *,
        weight: float = 1.0,
        rationale: str = "",
        tags: Optional[Iterable[str]] = None,
        metadata: Optional[Mapping[str, Any]] = None,
        bidirectional: bool = False,
    ) -> Tuple[KnowledgeEdge, Optional[KnowledgeEdge]]:
        """Create an edge (and optionally its reverse) between two nodes."""

        normalised_tags = tuple(sorted({_normalise_tag(tag) for tag in (tags or []) if tag}))
        payload = dict(metadata or {})
        forward = KnowledgeEdge(
            source=source,
            target=target,
            relation=relation,
            weight=weight,
            rationale=rationale,
            tags=normalised_tags,
            metadata=payload,
        )
        created = self.add_edge(forward)

        reverse_edge: Optional[KnowledgeEdge] = None
        if bidirectional:
            reverse_edge = KnowledgeEdge(
                source=target,
                target=source,
                relation=relation,
                weight=weight,
                rationale=rationale,
                tags=normalised_tags,
                metadata=payload,
            )
            reverse_edge = self.add_edge(reverse_edge)

        return created, reverse_edge

    def edges_from(self, identifier: str) -> Tuple[KnowledgeEdge, ...]:
        """Return outbound edges from a node."""

        return tuple(self._outbound.get(identifier, ()))

    def edges_to(self, identifier: str) -> Tuple[KnowledgeEdge, ...]:
        """Return inbound edges to a node."""

        return tuple(self._inbound.get(identifier, ()))

    def neighbors(self, identifier: str, relation: Optional[str] = None) -> Tuple[KnowledgeNode, ...]:
        """Return neighbour nodes for the supplied identifier."""

        neighbours: List[KnowledgeNode] = []
        for edge in self._outbound.get(identifier, ()):  # type: ignore[assignment]
            if relation and edge.relation != relation:
                continue
            target = self.nodes.get(edge.target)
            if target:
                neighbours.append(target)
        return tuple(neighbours)

    def search(
        self,
        query: str,
        *,
        limit: int = 5,
        required_tags: Optional[Sequence[str]] = None,
    ) -> List[KnowledgeSearchHit]:
        """Search nodes using token overlap heuristics."""

        query_terms = {_normalise_tag(term) for term in _tokenise(query)}
        tag_filters = {_normalise_tag(tag) for tag in (required_tags or []) if tag}

        hits: List[KnowledgeSearchHit] = []
        for node in self.nodes.values():
            node_terms = set(node.key_terms())
            matched_terms = tuple(sorted(node_terms & query_terms)) if query_terms else tuple()
            tag_overlap = tuple(sorted(set(node.tags) & tag_filters)) if tag_filters else tuple()

            if query_terms and not matched_terms:
                continue
            if tag_filters and not tag_overlap:
                continue

            base_score = 1.0 if matched_terms else 0.3
            score = base_score + 0.15 * len(matched_terms) + 0.1 * len(tag_overlap)
            score *= node.importance()
            hits.append(
                KnowledgeSearchHit(
                    node=node,
                    score=score,
                    matched_terms=matched_terms,
                    tag_overlap=tag_overlap,
                )
            )

        hits.sort(key=lambda hit: hit.score, reverse=True)
        return hits[:limit]

    def extract_subgraph(self, seeds: Sequence[str], depth: int = 1) -> KnowledgeGraphSnapshot:
        """Return a snapshot containing all nodes reachable within ``depth`` hops."""

        queue: Deque[Tuple[str, int]] = deque((seed, 0) for seed in seeds if seed in self.nodes)
        visited_nodes: Dict[str, KnowledgeNode] = {}
        collected_edges: List[KnowledgeEdge] = []
        seen_edges: set[Tuple[str, str, str]] = set()

        while queue:
            identifier, level = queue.popleft()
            if identifier in visited_nodes:
                continue

            node = self.nodes.get(identifier)
            if node is None:
                continue

            visited_nodes[identifier] = node
            if level >= depth:
                continue

            for edge in self._outbound.get(identifier, []):
                key = (edge.source, edge.target, edge.relation)
                if key not in seen_edges:
                    collected_edges.append(edge)
                    seen_edges.add(key)
                queue.append((edge.target, level + 1))

        return KnowledgeGraphSnapshot(nodes=visited_nodes, edges=tuple(collected_edges))

    def shortest_path(self, source: str, target: str, *, max_depth: int = 4) -> Optional[List[KnowledgeEdge]]:
        """Return the shortest path edges from ``source`` to ``target``."""

        if source not in self.nodes or target not in self.nodes:
            return None

        frontier: Deque[Tuple[str, List[KnowledgeEdge]]] = deque([(source, [])])
        visited: Dict[str, int] = {source: 0}

        while frontier:
            current, path = frontier.popleft()
            if len(path) >= max_depth:
                continue

            for edge in self._outbound.get(current, []):
                next_path = path + [edge]
                if edge.target == target:
                    return next_path

                existing_depth = visited.get(edge.target)
                if existing_depth is None or len(next_path) < existing_depth:
                    visited[edge.target] = len(next_path)
                    frontier.append((edge.target, next_path))

        return None


class DynamicKnowledgeEngine:
    """High-level orchestration layer for building a Dynamic knowledge graph."""

    def __init__(
        self,
        *,
        graph: Optional[KnowledgeGraph] = None,
        tag_link_relation: str = "related",
        tag_link_weight: float = 0.5,
    ) -> None:
        self.graph = graph or KnowledgeGraph()
        self.tag_link_relation = tag_link_relation
        self.tag_link_weight = tag_link_weight
        self._pending_edges: MutableMapping[str, List[KnowledgeEdge]] = defaultdict(list)

    def ingest_entry(self, entry: KnowledgeEntry) -> KnowledgeNode:
        """Ingest a knowledge entry and auto-link it into the graph."""

        tags = tuple({_normalise_tag(tag) for tag in entry.tags if tag})
        summary = self._build_summary(entry.content)
        sources = tuple(entry.sources)
        metadata = dict(entry.metadata)
        node = KnowledgeNode(
            identifier=entry.identifier,
            title=entry.title,
            summary=summary,
            tags=tags,
            sources=sources,
            metadata=metadata,
        )
        stored = self.graph.add_node(node)
        self._resolve_pending_edges(stored.identifier)

        for relation in entry.relations:
            rationale = relation.rationale or f"Linked via ingestion hint '{relation.relation}'."
            edge = KnowledgeEdge(
                source=entry.identifier,
                target=relation.target,
                relation=relation.relation,
                weight=relation.weight,
                rationale=rationale,
                tags=tuple({_normalise_tag(tag) for tag in relation.tags}),
                metadata=dict(relation.metadata),
            )
            self._link_or_queue(edge)

        if stored.tags:
            self._autolink_by_tags(stored)

        return stored

    def batch_ingest(self, entries: Iterable[KnowledgeEntry]) -> List[KnowledgeNode]:
        """Ingest multiple entries sequentially."""

        return [self.ingest_entry(entry) for entry in entries]

    def connect(
        self,
        source: str,
        target: str,
        relation: str,
        *,
        weight: float = 1.0,
        rationale: str = "",
        tags: Optional[Iterable[str]] = None,
        metadata: Optional[Mapping[str, Any]] = None,
        bidirectional: bool = False,
    ) -> Tuple[KnowledgeEdge, Optional[KnowledgeEdge]]:
        """Manually connect two nodes."""

        return self.graph.link(
            source,
            target,
            relation,
            weight=weight,
            rationale=rationale,
            tags=tags,
            metadata=metadata,
            bidirectional=bidirectional,
        )

    def query(
        self,
        query: str,
        *,
        limit: int = 5,
        required_tags: Optional[Sequence[str]] = None,
    ) -> List[KnowledgeSearchHit]:
        """Query the graph using token overlap heuristics."""

        return self.graph.search(query, limit=limit, required_tags=required_tags)

    def explain(self, query: str, *, limit: int = 5) -> List[Dict[str, Any]]:
        """Return an explainable view for query results."""

        hits = self.query(query, limit=limit)
        explanations: List[Dict[str, Any]] = []
        for hit in hits:
            related_edges = self.graph.edges_from(hit.node.identifier)
            neighbours = [
                {
                    "target": edge.target,
                    "relation": edge.relation,
                    "weight": edge.weight,
                    "title": self.graph.nodes.get(edge.target).title if edge.target in self.graph.nodes else None,
                }
                for edge in related_edges[:5]
            ]
            explanations.append(
                {
                    "identifier": hit.node.identifier,
                    "title": hit.node.title,
                    "score": hit.score,
                    "matched_terms": hit.matched_terms,
                    "tag_overlap": hit.tag_overlap,
                    "neighbours": neighbours,
                }
            )
        return explanations

    def describe_subgraph(self, seeds: Sequence[str] | str, depth: int = 1) -> str:
        """Produce a textual summary of the subgraph rooted at ``seeds``."""

        if isinstance(seeds, str):
            seed_list = [seeds]
        else:
            seed_list = list(seeds)
        snapshot = self.graph.extract_subgraph(seed_list, depth)
        lines = [
            f"Subgraph contains {len(snapshot.nodes)} nodes and {len(snapshot.edges)} edges (depth={depth}).",
        ]
        for identifier, node in snapshot.nodes.items():
            relations = [
                f"{edge.relation} → {self.graph.nodes[edge.target].title}"
                for edge in snapshot.edges
                if edge.source == identifier and edge.target in snapshot.nodes
            ]
            if relations:
                lines.append(f"- {node.title}: {', '.join(relations[:5])}")
            else:
                lines.append(f"- {node.title}: no outbound relations within depth {depth}.")
        return "\n".join(lines)

    def recommend_links(self, identifier: str, *, limit: int = 5) -> List[LinkRecommendation]:
        """Recommend new links for a node based on tag overlap and importance."""

        node = self.graph.nodes.get(identifier)
        if node is None:
            return []

        existing_targets = {edge.target for edge in self.graph.edges_from(identifier)}
        candidates: List[LinkRecommendation] = []
        for candidate in self.graph.nodes.values():
            if candidate.identifier == identifier or candidate.identifier in existing_targets:
                continue
            shared_tags = tuple(sorted(set(node.tags) & set(candidate.tags)))
            if not shared_tags:
                continue
            score = (1.0 + 0.2 * len(shared_tags)) * node.importance() * candidate.importance()
            rationale = f"Shared taxonomy overlap on: {', '.join(shared_tags)}."
            candidates.append(
                LinkRecommendation(
                    source=node,
                    target=candidate,
                    score=score,
                    shared_tags=shared_tags,
                    rationale=rationale,
                )
            )

        candidates.sort(key=lambda rec: rec.score, reverse=True)
        return candidates[:limit]

    def shortest_path(self, source: str, target: str, *, max_depth: int = 4) -> Optional[List[KnowledgeEdge]]:
        """Wrapper returning the shortest path between two nodes."""

        return self.graph.shortest_path(source, target, max_depth=max_depth)

    def _build_summary(self, content: str, *, max_sentences: int = 3, max_length: int = 280) -> str:
        """Generate a compact summary using simple heuristics."""

        text = content.strip()
        if not text:
            return ""

        sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", text) if segment.strip()]
        if not sentences:
            sentences = [text]

        summary = " ".join(sentences[:max_sentences])
        if len(summary) > max_length:
            truncated = summary[:max_length].rsplit(" ", 1)[0]
            summary = truncated + "…" if truncated else summary[:max_length]
        return summary

    def _autolink_by_tags(self, node: KnowledgeNode) -> None:
        """Create lightweight relationships for overlapping tags."""

        node_tags = set(node.tags)
        for candidate in self.graph.nodes.values():
            if candidate.identifier == node.identifier:
                continue
            shared = tuple(sorted(node_tags & set(candidate.tags)))
            if not shared:
                continue
            if self.graph.has_edge(node.identifier, candidate.identifier, self.tag_link_relation):
                continue

            rationale = f"Shared taxonomy overlap on: {', '.join(shared)}."
            weight = self.tag_link_weight + 0.1 * len(shared)
            metadata = {"link_type": "tag_overlap"}
            self.graph.link(
                node.identifier,
                candidate.identifier,
                self.tag_link_relation,
                weight=weight,
                rationale=rationale,
                tags=shared,
                metadata=metadata,
                bidirectional=True,
            )

    def _link_or_queue(self, edge: KnowledgeEdge) -> None:
        """Attempt to link the edge, queueing it if required nodes are missing."""

        missing: List[str] = []
        if edge.source not in self.graph.nodes:
            missing.append(edge.source)
        if edge.target not in self.graph.nodes:
            missing.append(edge.target)

        if not missing:
            self.graph.add_edge(edge)
            return

        for identifier in missing:
            queue = self._pending_edges.setdefault(identifier, [])
            if edge not in queue:
                queue.append(edge)

    def _resolve_pending_edges(self, identifier: str) -> None:
        """Attempt to flush pending edges when a new node is inserted."""

        pending = self._pending_edges.pop(identifier, [])
        if not pending:
            return

        for edge in list(pending):
            self._link_or_queue(edge)

