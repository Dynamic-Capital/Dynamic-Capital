"""Dynamic Mapping Engine for orchestrating knowledge maps."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from itertools import combinations
from typing import Dict, Iterable, List, Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "MapNode",
    "MapConnection",
    "MapLayer",
    "MapOverlay",
    "MapRoute",
    "MapScenario",
    "MapBlueprint",
    "MapView",
    "DynamicMappingEngine",
]


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback is not None:
        candidate = (fallback or "").strip()
        if candidate:
            return candidate
    raise ValueError("text value must not be empty")


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for raw in values:
        candidate = raw.strip().lower()
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        ordered.append(candidate)
    return tuple(ordered)


def _normalise_identifier(value: str) -> str:
    return _normalise_text(value).lower().replace(" ", "_")


def _tag_alignment(tags: Sequence[str], focus: Sequence[str]) -> float:
    if not tags or not focus:
        return 0.0
    tag_set = {tag.lower() for tag in tags if tag}
    focus_set = {tag.lower() for tag in focus if tag}
    if not tag_set or not focus_set:
        return 0.0
    intersection = len(tag_set & focus_set)
    union = len(tag_set | focus_set)
    if union == 0:
        return 0.0
    return intersection / union


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


@dataclass(slots=True)
class MapNode:
    """Representation of a node in the mapping fabric."""

    identifier: str
    name: str
    category: str | None = None
    weight: float = 1.0
    coordinates: tuple[float, float] | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.name = _normalise_text(self.name, fallback=self.identifier)
        self.category = (
            _normalise_text(self.category) if self.category is not None else None
        )
        self.weight = _clamp(self.weight, 0.0, 100.0)
        if self.coordinates is not None:
            if len(self.coordinates) != 2:
                raise ValueError("coordinates must contain two values")
            self.coordinates = (float(self.coordinates[0]), float(self.coordinates[1]))
        self.tags = _normalise_tags(self.tags)
        if self.metadata is None:
            self.metadata = {}
        else:
            self.metadata = dict(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        data: MutableMapping[str, object] = {
            "id": self.identifier,
            "name": self.name,
            "weight": self.weight,
            "tags": list(self.tags),
        }
        if self.category:
            data["category"] = self.category
        if self.coordinates is not None:
            data["coordinates"] = list(self.coordinates)
        if self.metadata:
            data["metadata"] = dict(self.metadata)
        return data


@dataclass(slots=True)
class MapConnection:
    """Directional or undirected relationship between two nodes."""

    source: str
    target: str
    relation: str
    intensity: float = 0.5
    directed: bool = False
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.source = _normalise_identifier(self.source)
        self.target = _normalise_identifier(self.target)
        if self.source == self.target:
            raise ValueError("source and target must be different")
        self.relation = _normalise_text(self.relation)
        self.intensity = _clamp(self.intensity, 0.0, 1.0)
        if self.metadata is None:
            self.metadata = {}
        else:
            self.metadata = dict(self.metadata)

    def involves(self, node_id: str) -> bool:
        identifier = _normalise_identifier(node_id)
        return self.source == identifier or self.target == identifier

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "source": self.source,
            "target": self.target,
            "relation": self.relation,
            "intensity": self.intensity,
            "directed": self.directed,
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class MapLayer:
    """Collection of related nodes and connections."""

    name: str
    description: str
    nodes: tuple[MapNode, ...] = field(default_factory=tuple)
    connections: tuple[MapConnection, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.description = _normalise_text(self.description)
        node_index: dict[str, MapNode] = {}
        normalised_nodes: list[MapNode] = []
        for node in self.nodes:
            if not isinstance(node, MapNode):
                raise TypeError("nodes must contain MapNode instances")
            if node.identifier in node_index:
                raise ValueError(f"duplicate node identifier: {node.identifier}")
            node_index[node.identifier] = node
            normalised_nodes.append(node)
        normalised_connections: list[MapConnection] = []
        for connection in self.connections:
            if not isinstance(connection, MapConnection):
                raise TypeError("connections must contain MapConnection instances")
            if connection.source not in node_index:
                raise ValueError(
                    f"connection source '{connection.source}' not present in layer"
                )
            if connection.target not in node_index:
                raise ValueError(
                    f"connection target '{connection.target}' not present in layer"
                )
            normalised_connections.append(connection)
        self.nodes = tuple(normalised_nodes)
        self.connections = tuple(normalised_connections)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "nodes": [node.as_dict() for node in self.nodes],
            "connections": [connection.as_dict() for connection in self.connections],
        }


@dataclass(slots=True)
class MapOverlay:
    """Qualitative overlay that emphasises nodes with specific properties."""

    name: str
    description: str
    focus_tags: tuple[str, ...] = field(default_factory=tuple)
    focus_nodes: tuple[str, ...] = field(default_factory=tuple)
    weight: float = 1.0

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.description = _normalise_text(self.description)
        self.focus_tags = _normalise_tags(self.focus_tags)
        self.focus_nodes = tuple(_normalise_identifier(node) for node in self.focus_nodes)
        self.weight = _clamp(self.weight, 0.0, 10.0)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "focus_tags": list(self.focus_tags),
            "focus_nodes": list(self.focus_nodes),
            "weight": self.weight,
        }


@dataclass(slots=True)
class MapRoute:
    """Recommended traversal between waypoints within the mapping fabric."""

    name: str
    description: str
    waypoints: tuple[MapNode, ...]
    connections: tuple[MapConnection, ...]
    score: float = 0.0
    hops: int = 1
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.description = _normalise_text(self.description, fallback=self.name)
        if len(self.waypoints) < 2:
            raise ValueError("route must include at least two waypoints")
        verified_waypoints: list[MapNode] = []
        for waypoint in self.waypoints:
            if not isinstance(waypoint, MapNode):
                raise TypeError("waypoints must contain MapNode instances")
            verified_waypoints.append(waypoint)
        self.waypoints = tuple(verified_waypoints)
        verified_connections: list[MapConnection] = []
        for connection in self.connections:
            if not isinstance(connection, MapConnection):
                raise TypeError("connections must contain MapConnection instances")
            verified_connections.append(connection)
        self.connections = tuple(verified_connections)
        self.score = _clamp(self.score, 0.0, 1.0)
        self.hops = max(int(self.hops), 1)
        if self.metadata is None:
            self.metadata = {}
        else:
            if not isinstance(self.metadata, Mapping):
                raise TypeError("metadata must be a mapping if provided")
            self.metadata = dict(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "name": self.name,
            "description": self.description,
            "waypoints": [waypoint.as_dict() for waypoint in self.waypoints],
            "connections": [connection.as_dict() for connection in self.connections],
            "score": self.score,
            "hops": self.hops,
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class MapScenario:
    """Scenario describing which layers and priorities to combine."""

    name: str
    objective: str
    key_layers: tuple[str, ...]
    focus_tags: tuple[str, ...] = field(default_factory=tuple)
    focus_nodes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.objective = _normalise_text(self.objective)
        if not self.key_layers:
            raise ValueError("scenario must reference at least one layer")
        self.key_layers = tuple(_normalise_text(layer) for layer in self.key_layers)
        self.focus_tags = _normalise_tags(self.focus_tags)
        self.focus_nodes = tuple(_normalise_identifier(node) for node in self.focus_nodes)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "objective": self.objective,
            "key_layers": list(self.key_layers),
            "focus_tags": list(self.focus_tags),
            "focus_nodes": list(self.focus_nodes),
        }


@dataclass(slots=True)
class MapView:
    """Configuration describing how a scenario should be rendered."""

    title: str
    narrative: str
    overlay_names: tuple[str, ...] = field(default_factory=tuple)
    highlight_limit: int = 8

    def __post_init__(self) -> None:
        self.title = _normalise_text(self.title)
        self.narrative = _normalise_text(self.narrative)
        self.overlay_names = tuple(_normalise_text(name) for name in self.overlay_names)
        self.highlight_limit = max(int(self.highlight_limit), 1)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "title": self.title,
            "narrative": self.narrative,
            "overlay_names": list(self.overlay_names),
            "highlight_limit": self.highlight_limit,
        }


@dataclass(slots=True)
class MapBlueprint:
    """Resulting structure once the engine composes a scenario and view."""

    scenario: MapScenario
    view: MapView
    layers: tuple[MapLayer, ...]
    overlays: tuple[MapOverlay, ...]
    highlighted_nodes: tuple[MapNode, ...]
    highlighted_connections: tuple[MapConnection, ...]
    routes: tuple[MapRoute, ...]
    insights: tuple[str, ...]
    recommended_actions: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "scenario": self.scenario.as_dict(),
            "view": self.view.as_dict(),
            "layers": [layer.as_dict() for layer in self.layers],
            "overlays": [overlay.as_dict() for overlay in self.overlays],
            "highlighted_nodes": [node.as_dict() for node in self.highlighted_nodes],
            "highlighted_connections": [
                connection.as_dict() for connection in self.highlighted_connections
            ],
            "routes": [route.as_dict() for route in self.routes],
            "insights": list(self.insights),
            "recommended_actions": list(self.recommended_actions),
        }


class DynamicMappingEngine:
    """Orchestrate layers, overlays, and insights into a living map."""

    def __init__(self) -> None:
        self._layers: Dict[str, MapLayer] = {}
        self._overlays: Dict[str, MapOverlay] = {}

    # ---------------------------------------------------------------- layers
    def register_layer(self, layer: MapLayer) -> None:
        if not isinstance(layer, MapLayer):  # pragma: no cover - guard
            raise TypeError("layer must be a MapLayer instance")
        if layer.name in self._layers:
            raise ValueError(f"layer '{layer.name}' already registered")
        self._layers[layer.name] = layer

    def register_layers(self, layers: Iterable[MapLayer]) -> None:
        for layer in layers:
            self.register_layer(layer)

    def get_layer(self, name: str) -> MapLayer:
        key = _normalise_text(name)
        try:
            return self._layers[key]
        except KeyError as exc:  # pragma: no cover - guard
            raise KeyError(f"layer '{name}' not found") from exc

    # ---------------------------------------------------------------- overlays
    def register_overlay(self, overlay: MapOverlay) -> None:
        if not isinstance(overlay, MapOverlay):  # pragma: no cover - guard
            raise TypeError("overlay must be a MapOverlay instance")
        if overlay.name in self._overlays:
            raise ValueError(f"overlay '{overlay.name}' already registered")
        self._overlays[overlay.name] = overlay

    def register_overlays(self, overlays: Iterable[MapOverlay]) -> None:
        for overlay in overlays:
            self.register_overlay(overlay)

    def get_overlay(self, name: str) -> MapOverlay:
        key = _normalise_text(name)
        try:
            return self._overlays[key]
        except KeyError as exc:  # pragma: no cover - guard
            raise KeyError(f"overlay '{name}' not found") from exc

    # ----------------------------------------------------------------- engine
    def compose(self, scenario: MapScenario, view: MapView) -> MapBlueprint:
        layer_bundle = [self.get_layer(name) for name in scenario.key_layers]
        overlay_bundle = [self.get_overlay(name) for name in view.overlay_names]

        node_index: Dict[str, MapNode] = {}
        adjacency: Dict[str, List[MapConnection]] = {}
        for layer in layer_bundle:
            for node in layer.nodes:
                if node.identifier not in node_index:
                    node_index[node.identifier] = node
                    adjacency[node.identifier] = []
            for connection in layer.connections:
                adjacency[connection.source].append(connection)
                adjacency[connection.target].append(connection)

        if not node_index:
            raise RuntimeError("scenario resolved to zero nodes")

        highlighted_nodes = self._select_highlighted_nodes(
            node_index,
            adjacency,
            scenario,
            overlay_bundle,
            limit=view.highlight_limit,
        )
        highlighted_connections = self._select_highlighted_connections(
            highlighted_nodes, adjacency
        )
        routes = self._derive_routes(
            node_index,
            adjacency,
            highlighted_nodes,
            scenario,
            overlay_bundle,
        )
        insights = self._generate_insights(
            highlighted_nodes, highlighted_connections, scenario
        )
        actions = self._generate_actions(highlighted_nodes, scenario)
        return MapBlueprint(
            scenario=scenario,
            view=view,
            layers=tuple(layer_bundle),
            overlays=tuple(overlay_bundle),
            highlighted_nodes=highlighted_nodes,
            highlighted_connections=highlighted_connections,
            routes=routes,
            insights=insights,
            recommended_actions=actions,
        )

    # ------------------------------------------------------------- heuristics
    def _select_highlighted_nodes(
        self,
        node_index: Mapping[str, MapNode],
        adjacency: Mapping[str, Sequence[MapConnection]],
        scenario: MapScenario,
        overlays: Sequence[MapOverlay],
        *,
        limit: int,
    ) -> tuple[MapNode, ...]:
        focus_lookup = {node_id: True for node_id in scenario.focus_nodes}
        for overlay in overlays:
            for node_id in overlay.focus_nodes:
                focus_lookup.setdefault(node_id, True)

        def score(node: MapNode) -> float:
            base = node.weight
            base += 0.75 * _tag_alignment(node.tags, scenario.focus_tags)
            degree = len(adjacency.get(node.identifier, ()))
            base += min(degree, 8) * 0.05
            if node.identifier in focus_lookup:
                base += 1.5
            for overlay in overlays:
                overlay_bonus = 0.0
                if node.identifier in overlay.focus_nodes:
                    overlay_bonus += overlay.weight
                overlay_bonus += overlay.weight * _tag_alignment(
                    node.tags, overlay.focus_tags
                )
                base += overlay_bonus
            return base

        ranked = sorted(node_index.values(), key=score, reverse=True)
        selected = ranked[:limit]
        return tuple(selected)

    def _select_highlighted_connections(
        self,
        nodes: Sequence[MapNode],
        adjacency: Mapping[str, Sequence[MapConnection]],
    ) -> tuple[MapConnection, ...]:
        node_ids = {node.identifier for node in nodes}
        connection_map: Dict[Tuple[str, str, str], MapConnection] = {}
        for node in nodes:
            for connection in adjacency.get(node.identifier, ()):
                other = connection.target if connection.source == node.identifier else connection.source
                if other not in node_ids:
                    continue
                key = tuple(sorted((connection.source, connection.target))) + (
                    connection.relation,
                )
                existing = connection_map.get(key)
                if existing is None or connection.intensity > existing.intensity:
                    connection_map[key] = connection
        return tuple(connection_map.values())

    def _derive_routes(
        self,
        node_index: Mapping[str, MapNode],
        adjacency: Mapping[str, Sequence[MapConnection]],
        highlighted_nodes: Sequence[MapNode],
        scenario: MapScenario,
        overlays: Sequence[MapOverlay],
        *,
        limit: int = 3,
    ) -> tuple[MapRoute, ...]:
        if len(highlighted_nodes) < 2:
            return ()

        focus_nodes = {node_id for node_id in scenario.focus_nodes}
        focus_tags = set(scenario.focus_tags)
        for overlay in overlays:
            focus_nodes.update(overlay.focus_nodes)
            focus_tags.update(overlay.focus_tags)

        def _shortest_path(
            start: str, target: str
        ) -> tuple[tuple[str, ...], tuple[MapConnection, ...]] | None:
            queue = deque([start])
            visited: Dict[str, tuple[str | None, MapConnection | None]] = {
                start: (None, None)
            }
            while queue:
                current = queue.popleft()
                if current == target:
                    break
                for connection in adjacency.get(current, ()):  # pragma: no branch - BFS traversal
                    neighbour = (
                        connection.target
                        if connection.source == current
                        else connection.source
                    )
                    if neighbour in visited:
                        continue
                    visited[neighbour] = (current, connection)
                    queue.append(neighbour)
            if target not in visited:
                return None
            path_nodes: list[str] = []
            path_connections: list[MapConnection] = []
            pointer = target
            while pointer is not None:
                path_nodes.append(pointer)
                previous, connection = visited[pointer]
                if connection is not None:
                    path_connections.append(connection)
                pointer = previous
            path_nodes.reverse()
            path_connections.reverse()
            return tuple(path_nodes), tuple(path_connections)

        candidate_routes: list[
            tuple[
                float,
                int,
                str,
                tuple[str, ...],
                tuple[MapConnection, ...],
            ]
        ] = []
        seen_paths: set[tuple[str, ...]] = set()

        highlighted_ids = [node.identifier for node in highlighted_nodes]
        for start_id, end_id in combinations(highlighted_ids, 2):
            path = _shortest_path(start_id, end_id)
            if path is None:
                continue
            node_path, path_connections = path
            if len(node_path) < 2:
                continue
            if node_path in seen_paths:
                continue
            seen_paths.add(node_path)

            waypoints = tuple(node_index[node_id] for node_id in node_path)
            hops = len(waypoints) - 1
            intensity = (
                sum(connection.intensity for connection in path_connections) / len(path_connections)
                if path_connections
                else 0.0
            )
            endpoint_strength = min(
                (waypoints[0].weight + waypoints[-1].weight) / 200.0,
                1.0,
            )
            focus_bonus = 0.0
            if focus_nodes and any(
                waypoint.identifier in focus_nodes for waypoint in waypoints
            ):
                focus_bonus += 0.1
            if focus_tags and any(
                _tag_alignment(waypoint.tags, focus_tags) > 0.0
                for waypoint in waypoints
            ):
                focus_bonus += 0.1
            hop_modifier = max(0.3, 1.0 - 0.1 * max(hops - 1, 0))
            score = _clamp(
                (0.6 * intensity + 0.4 * endpoint_strength + focus_bonus) * hop_modifier,
                0.0,
                1.0,
            )
            name = f"{waypoints[0].name} → {waypoints[-1].name}"
            if hops == 1:
                description = (
                    f"Direct connection linking {waypoints[0].name} to {waypoints[-1].name}."
                )
            else:
                middle = ", ".join(node.name for node in waypoints[1:-1])
                description = (
                    f"Route {waypoints[0].name} through {middle} to reach {waypoints[-1].name}."
                )
            candidate_routes.append(
                (score, hops, name, node_path, path_connections, description)
            )

        if not candidate_routes:
            return ()

        candidate_routes.sort(
            key=lambda item: (-item[0], item[1], item[2].lower())
        )

        selected: list[MapRoute] = []
        for score, hops, name, node_path, path_connections, description in candidate_routes[:limit]:
            waypoints = tuple(node_index[node_id] for node_id in node_path)
            selected.append(
                MapRoute(
                    name=name,
                    description=description,
                    waypoints=waypoints,
                    connections=path_connections,
                    score=score,
                    hops=hops,
                )
            )
        return tuple(selected)

    def _generate_insights(
        self,
        nodes: Sequence[MapNode],
        connections: Sequence[MapConnection],
        scenario: MapScenario,
    ) -> tuple[str, ...]:
        insights: list[str] = []
        if nodes:
            strongest = max(nodes, key=lambda node: node.weight)
            insights.append(
                f"{strongest.name} anchors the scenario with a weight of {strongest.weight:.2f}."
            )
        if connections:
            densest = max(connections, key=lambda conn: conn.intensity)
            insights.append(
                f"The {densest.relation} link between {densest.source} and {densest.target}"
                f" exhibits the highest intensity at {densest.intensity:.2f}."
            )
        if scenario.focus_tags:
            insights.append(
                "Focus tags emphasised: " + ", ".join(sorted(scenario.focus_tags))
            )
        if not insights:
            insights.append("Scenario composed successfully with no dominant signals yet identified.")
        return tuple(insights)

    def _generate_actions(
        self, nodes: Sequence[MapNode], scenario: MapScenario
    ) -> tuple[str, ...]:
        actions: list[str] = []
        for node in nodes:
            action = (
                f"Activate {node.name} to accelerate {scenario.objective.lower()}"
                if scenario.objective
                else f"Engage {node.name} to progress scenario goals"
            )
            actions.append(action)
        if not actions:
            actions.append("Incorporate additional nodes to enable actionable recommendations.")
        return tuple(actions)

    # ----------------------------------------------------------------- utility
    def clear(self) -> None:
        self._layers.clear()
        self._overlays.clear()
