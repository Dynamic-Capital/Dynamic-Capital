"""Lightweight deep learning engine with deterministic training loops."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
import random
from typing import Callable, Iterable, Mapping, Sequence

__all__ = [
    "LayerBlueprint",
    "DynamicLayerEngineConfig",
    "DeepLearningLayerSpec",
    "DeepLearningModelSpec",
    "TrainingSample",
    "TrainingMetrics",
    "DynamicDeepLearningEngine",
    "generate_input_layers",
    "generate_domain_input_layers",
    "build_dynamic_ai_input_layers",
    "build_dynamic_agi_input_layers",
    "build_dynamic_ags_input_layers",
]


# ---------------------------------------------------------------------------
# configuration primitives


_SUPPORTED_ACTIVATIONS = {"relu", "tanh", "sigmoid", "linear", "softmax"}


@dataclass(frozen=True)
class _DomainLayerSpec:
    """Internal structure describing a domain layer profile."""

    name: str
    expansion: float
    activation: str
    dropout: float
    max_units: int | None = None


_DOMAIN_INPUT_LAYER_PROFILES: dict[str, tuple[_DomainLayerSpec, ...]] = {
    "dynamic_ai": (
        _DomainLayerSpec(
            name="dai_signal_ingest",
            expansion=1.5,
            activation="relu",
            dropout=0.05,
            max_units=512,
        ),
        _DomainLayerSpec(
            name="dai_context_fusion",
            expansion=1.75,
            activation="tanh",
            dropout=0.1,
            max_units=768,
        ),
        _DomainLayerSpec(
            name="dai_alignment_gate",
            expansion=0.85,
            activation="relu",
            dropout=0.05,
            max_units=640,
        ),
    ),
    "dynamic_agi": (
        _DomainLayerSpec(
            name="dagi_signal_intake",
            expansion=1.8,
            activation="relu",
            dropout=0.05,
            max_units=640,
        ),
        _DomainLayerSpec(
            name="dagi_cognitive_bridge",
            expansion=1.35,
            activation="tanh",
            dropout=0.1,
            max_units=896,
        ),
        _DomainLayerSpec(
            name="dagi_reasoning_core",
            expansion=1.2,
            activation="relu",
            dropout=0.1,
            max_units=1024,
        ),
        _DomainLayerSpec(
            name="dagi_alignment_hub",
            expansion=0.9,
            activation="tanh",
            dropout=0.05,
            max_units=896,
        ),
    ),
    "dynamic_ags": (
        _DomainLayerSpec(
            name="dags_context_intake",
            expansion=1.2,
            activation="relu",
            dropout=0.05,
            max_units=256,
        ),
        _DomainLayerSpec(
            name="dags_policy_composer",
            expansion=1.0,
            activation="tanh",
            dropout=0.05,
            max_units=256,
        ),
        _DomainLayerSpec(
            name="dags_governance_gate",
            expansion=0.8,
            activation="sigmoid",
            dropout=0.0,
            max_units=192,
        ),
    ),
}


_DOMAIN_ALIASES = {
    "dai": "dynamic_ai",
    "dynamicai": "dynamic_ai",
    "dynamic_ai": "dynamic_ai",
    "dynamic-ai": "dynamic_ai",
    "dynamic ai": "dynamic_ai",
    "dagi": "dynamic_agi",
    "dynamicagi": "dynamic_agi",
    "dynamic_agi": "dynamic_agi",
    "dynamic-agi": "dynamic_agi",
    "dynamic agi": "dynamic_agi",
    "dags": "dynamic_ags",
    "dynamicags": "dynamic_ags",
    "dynamic_ags": "dynamic_ags",
    "dynamic-ags": "dynamic_ags",
    "dynamic ags": "dynamic_ags",
}


ActivationForward = Callable[[Sequence[float]], list[float]]
ActivationDerivative = Callable[[Sequence[float], Sequence[float]], list[float]]


def _to_float_sequence(values: Iterable[float], *, name: str) -> tuple[float, ...]:
    converted: list[float] = []
    for index, value in enumerate(values):
        try:
            converted.append(float(value))
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
            raise TypeError(f"{name}[{index}] must be convertible to float") from exc
    if not converted:
        raise ValueError(f"{name} must contain at least one value")
    return tuple(converted)


def generate_input_layers(
    input_dim: int,
    *,
    depth: int,
    expansion_factor: float = 1.5,
    activation: str = "relu",
    dropout: float = 0.0,
    prefix: str = "input",
    max_units: int | None = None,
) -> tuple[LayerBlueprint, ...]:
    """Generate a progressive stack of :class:`LayerBlueprint` instances.

    Parameters
    ----------
    input_dim:
        Size of the input vector flowing into the first generated layer.
    depth:
        Number of blueprint layers to generate. Must be a positive integer.
    expansion_factor:
        Multiplicative factor applied to the previous layer's output dimension
        when selecting the number of units for the next layer. Values below
        ``1.0`` shrink the layer width while larger values widen it.
    activation:
        Activation applied to every generated layer.
    dropout:
        Dropout probability applied to every generated layer.
    prefix:
        Human-friendly prefix for naming the generated layers. Layer indices
        start at ``1``.
    max_units:
        Optional ceiling applied to the generated unit counts. When provided,
        each layer will be clamped to ``max_units``.

    Returns
    -------
    tuple[LayerBlueprint, ...]
        A tuple of blueprints that can be supplied to
        :class:`DynamicLayerEngineConfig`.
    """

    if depth <= 0:
        raise ValueError("depth must be positive")
    if input_dim <= 0:
        raise ValueError("input_dim must be positive")
    if expansion_factor == 0:
        raise ValueError("expansion_factor must be non-zero")
    if max_units is not None and max_units <= 0:
        raise ValueError("max_units must be positive when provided")

    current_units = float(input_dim)
    layers: list[LayerBlueprint] = []
    for index in range(depth):
        current_units *= float(expansion_factor)
        units = max(1, int(round(current_units)))
        if max_units is not None:
            units = min(units, int(max_units))
        layer_name = f"{prefix}_{index + 1}" if prefix else f"layer_{index + 1}"
        layers.append(
            LayerBlueprint(
                name=layer_name,
                units=units,
                activation=activation,
                dropout=dropout,
            )
        )
        current_units = float(units)
    return tuple(layers)


def _normalise_domain_key(domain: str) -> str:
    """Normalise a domain label so it can be resolved in the profile registry."""

    key = domain.strip().lower().replace("-", "_")
    key = " ".join(part for part in key.split())
    key = key.replace(" ", "_")
    return _DOMAIN_ALIASES.get(key, key)


def generate_domain_input_layers(domain: str, input_dim: int) -> tuple[LayerBlueprint, ...]:
    """Return the canonical input layer stack for a Dynamic domain.

    Parameters
    ----------
    domain:
        Domain identifier. Supports friendly aliases such as ``"DAI"`` or
        ``"dynamic agi"``.
    input_dim:
        Size of the input vector driving the first generated layer.

    Returns
    -------
    tuple[LayerBlueprint, ...]
        Layer stack tuned for the requested domain.
    """

    normalised = _normalise_domain_key(domain)
    try:
        profile = _DOMAIN_INPUT_LAYER_PROFILES[normalised]
    except KeyError as exc:
        raise ValueError(f"unknown domain: {domain}") from exc

    if input_dim <= 0:
        raise ValueError("input_dim must be positive")

    current_units = float(input_dim)
    layers: list[LayerBlueprint] = []
    for spec in profile:
        current_units *= spec.expansion
        units = max(1, int(round(current_units)))
        if spec.max_units is not None:
            units = min(units, spec.max_units)
        layers.append(
            LayerBlueprint(
                name=spec.name,
                units=units,
                activation=spec.activation,
                dropout=spec.dropout,
            )
        )
        current_units = float(units)
    return tuple(layers)


def build_dynamic_ai_input_layers(input_dim: int) -> tuple[LayerBlueprint, ...]:
    """Preset Dynamic AI input layers."""

    return generate_domain_input_layers("dynamic_ai", input_dim)


def build_dynamic_agi_input_layers(input_dim: int) -> tuple[LayerBlueprint, ...]:
    """Preset Dynamic AGI input layers."""

    return generate_domain_input_layers("dynamic_agi", input_dim)


def build_dynamic_ags_input_layers(input_dim: int) -> tuple[LayerBlueprint, ...]:
    """Preset Dynamic AGS input layers."""

    return generate_domain_input_layers("dynamic_ags", input_dim)


@dataclass(slots=True)
class LayerBlueprint:
    """High-level configuration describing a dense layer."""

    name: str
    units: int
    activation: str = "relu"
    dropout: float = 0.0

    def __post_init__(self) -> None:
        self.name = self.name.strip() or "layer"
        if self.units <= 0:
            raise ValueError("units must be positive")
        activation = self.activation.lower().strip()
        if activation not in _SUPPORTED_ACTIVATIONS:
            raise ValueError(f"activation must be one of {_SUPPORTED_ACTIVATIONS}")
        self.activation = activation
        self.dropout = float(self.dropout)
        if not 0.0 <= self.dropout < 1.0:
            raise ValueError("dropout must be in [0, 1)")

    def as_spec(self, input_dim: int) -> "DeepLearningLayerSpec":
        """Create a concrete :class:`DeepLearningLayerSpec` for ``input_dim``."""

        return DeepLearningLayerSpec(
            name=self.name,
            input_dim=input_dim,
            output_dim=self.units,
            activation=self.activation,
            dropout=self.dropout,
        )


@dataclass(slots=True)
class DeepLearningLayerSpec:
    """Declarative description of a dense layer."""

    name: str
    input_dim: int
    output_dim: int
    activation: str = "relu"
    dropout: float = 0.0

    def __post_init__(self) -> None:
        self.name = self.name.strip() or "layer"
        if self.input_dim <= 0:
            raise ValueError("input_dim must be positive")
        if self.output_dim <= 0:
            raise ValueError("output_dim must be positive")
        activation = self.activation.lower().strip()
        if activation not in _SUPPORTED_ACTIVATIONS:
            raise ValueError(f"activation must be one of {_SUPPORTED_ACTIVATIONS}")
        self.activation = activation
        self.dropout = float(self.dropout)
        if not 0.0 <= self.dropout < 1.0:
            raise ValueError("dropout must be in [0, 1)")


@dataclass(slots=True)
class DeepLearningModelSpec:
    """Container describing the end-to-end network structure."""

    layers: Sequence[DeepLearningLayerSpec]
    learning_rate: float = 0.01
    momentum: float = 0.0
    l2_regularisation: float = 0.0
    gradient_clip: float | None = 5.0
    seed: int | None = None
    shuffle_training: bool = True

    def __post_init__(self) -> None:
        if not self.layers:
            raise ValueError("model specification requires at least one layer")
        self.layers = tuple(self.layers)
        for index, layer in enumerate(self.layers):
            if index > 0:
                previous = self.layers[index - 1]
                if previous.output_dim != layer.input_dim:
                    raise ValueError(
                        "layer dimensions must chain: "
                        f"layer {previous.name} output={previous.output_dim} does not "
                        f"match layer {layer.name} input={layer.input_dim}"
                    )
        self.learning_rate = max(1e-5, float(self.learning_rate))
        self.momentum = max(0.0, min(0.99, float(self.momentum)))
        self.l2_regularisation = max(0.0, float(self.l2_regularisation))
        if self.gradient_clip is not None:
            self.gradient_clip = max(0.01, float(self.gradient_clip))
        self.seed = int(self.seed) if self.seed is not None else None
        self.shuffle_training = bool(self.shuffle_training)

    @property
    def input_dim(self) -> int:
        return self.layers[0].input_dim

    @property
    def output_dim(self) -> int:
        return self.layers[-1].output_dim


@dataclass(slots=True)
class DynamicLayerEngineConfig:
    """Composable configuration for stacking dense layers."""

    input_dim: int
    input_layers: Sequence[LayerBlueprint] = ()
    hidden_layers: Sequence[LayerBlueprint] = ()
    output_layers: Sequence[LayerBlueprint] = ()
    learning_rate: float = 0.01
    momentum: float = 0.0
    l2_regularisation: float = 0.0
    gradient_clip: float | None = 5.0
    seed: int | None = None
    shuffle_training: bool = True

    def __post_init__(self) -> None:
        self.input_dim = int(self.input_dim)
        if self.input_dim <= 0:
            raise ValueError("input_dim must be positive")
        self.input_layers = self._coerce_layers(self.input_layers, "input_layers")
        self.hidden_layers = self._coerce_layers(self.hidden_layers, "hidden_layers")
        self.output_layers = self._coerce_layers(self.output_layers, "output_layers")
        if not self.output_layers:
            raise ValueError("configuration requires at least one output layer")
        if not (self.input_layers or self.hidden_layers or self.output_layers):
            raise ValueError("configuration requires at least one layer")
        self.learning_rate = max(1e-5, float(self.learning_rate))
        self.momentum = max(0.0, min(0.99, float(self.momentum)))
        self.l2_regularisation = max(0.0, float(self.l2_regularisation))
        if self.gradient_clip is not None:
            self.gradient_clip = max(0.01, float(self.gradient_clip))
        self.seed = int(self.seed) if self.seed is not None else None
        self.shuffle_training = bool(self.shuffle_training)

    def _coerce_layers(
        self,
        layers: Sequence[LayerBlueprint] | Sequence[Mapping[str, object]],
        name: str,
    ) -> tuple[LayerBlueprint, ...]:
        normalised: list[LayerBlueprint] = []
        for index, layer in enumerate(layers):
            if isinstance(layer, LayerBlueprint):
                normalised.append(layer)
            elif isinstance(layer, Mapping):
                normalised.append(LayerBlueprint(**layer))
            else:  # pragma: no cover - guard against invalid data
                raise TypeError(f"{name}[{index}] must be LayerBlueprint or mapping")
        return tuple(normalised)

    @property
    def layers(self) -> tuple[LayerBlueprint, ...]:
        return self.input_layers + self.hidden_layers + self.output_layers

    @property
    def output_dim(self) -> int:
        return self.layers[-1].units

    def build_model_spec(self) -> DeepLearningModelSpec:
        """Create a :class:`DeepLearningModelSpec` from the configuration."""

        specs: list[DeepLearningLayerSpec] = []
        previous = self.input_dim
        for layer in self.layers:
            spec = layer.as_spec(previous)
            specs.append(spec)
            previous = spec.output_dim
        return DeepLearningModelSpec(
            layers=specs,
            learning_rate=self.learning_rate,
            momentum=self.momentum,
            l2_regularisation=self.l2_regularisation,
            gradient_clip=self.gradient_clip,
            seed=self.seed,
            shuffle_training=self.shuffle_training,
        )


@dataclass(slots=True)
class TrainingSample:
    """Single training example."""

    features: Sequence[float]
    target: Sequence[float]
    weight: float = 1.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.features = _to_float_sequence(self.features, name="features")
        self.target = _to_float_sequence(self.target, name="target")
        if self.weight <= 0.0:
            raise ValueError("weight must be positive")
        self.weight = float(self.weight)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):  # pragma: no cover
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class TrainingMetrics:
    """Aggregated metrics captured after each training epoch."""

    epoch: int
    loss: float
    accuracy: float | None
    sample_count: int
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    note: str | None = None


# ---------------------------------------------------------------------------
# activation helpers


def _relu(value: float) -> float:
    return value if value > 0.0 else 0.0


def _relu_derivative(value: float) -> float:
    return 1.0 if value > 0.0 else 0.0


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def _sigmoid_derivative(activated: float) -> float:
    return activated * (1.0 - activated)


def _tanh(value: float) -> float:
    return math.tanh(value)


def _tanh_derivative(activated: float) -> float:
    return 1.0 - activated * activated


def _linear(value: float) -> float:
    return value


def _linear_derivative(_: float) -> float:
    return 1.0


def _softmax(values: Sequence[float]) -> list[float]:
    max_value = max(values)
    exps = [math.exp(value - max_value) for value in values]
    total = sum(exps) or 1.0
    return [item / total for item in exps]


def _softmax_derivative(_: Sequence[float], activated: Sequence[float]) -> list[float]:
    return [1.0 for _ in activated]


def _relu_forward(values: Sequence[float]) -> list[float]:
    return [_relu(value) for value in values]


def _sigmoid_forward(values: Sequence[float]) -> list[float]:
    return [_sigmoid(value) for value in values]


def _tanh_forward(values: Sequence[float]) -> list[float]:
    return [_tanh(value) for value in values]


def _linear_forward(values: Sequence[float]) -> list[float]:
    return [_linear(value) for value in values]


def _relu_backward(
    activated: Sequence[float], pre_activated: Sequence[float]
) -> list[float]:
    return [_relu_derivative(value) for value in pre_activated]


def _sigmoid_backward(
    activated: Sequence[float], pre_activated: Sequence[float]
) -> list[float]:
    return [_sigmoid_derivative(value) for value in activated]


def _tanh_backward(
    activated: Sequence[float], pre_activated: Sequence[float]
) -> list[float]:
    return [_tanh_derivative(value) for value in activated]


def _linear_backward(
    activated: Sequence[float], pre_activated: Sequence[float]
) -> list[float]:
    return [_linear_derivative(value) for value in activated]


_ACTIVATION_FORWARD: dict[str, ActivationForward] = {
    "relu": _relu_forward,
    "sigmoid": _sigmoid_forward,
    "tanh": _tanh_forward,
    "linear": _linear_forward,
    "softmax": _softmax,
}

_ACTIVATION_DERIVATIVE: dict[str, ActivationDerivative] = {
    "relu": _relu_backward,
    "sigmoid": _sigmoid_backward,
    "tanh": _tanh_backward,
    "linear": _linear_backward,
    "softmax": _softmax_derivative,
}


def _activation_forward(name: str, values: Sequence[float]) -> list[float]:
    try:
        return _ACTIVATION_FORWARD[name](values)
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"Unsupported activation: {name}") from exc


def _activation_derivative(
    name: str, activated: Sequence[float], pre_activated: Sequence[float]
) -> list[float]:
    try:
        return _ACTIVATION_DERIVATIVE[name](activated, pre_activated)
    except KeyError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"Unsupported activation: {name}") from exc


# ---------------------------------------------------------------------------
# core engine


class DynamicDeepLearningEngine:
    """Deterministic dense-network trainer with lightweight heuristics."""

    def __init__(self, spec: DeepLearningModelSpec) -> None:
        self.spec = spec
        self._rng = random.Random(spec.seed or 0)
        self._layers = spec.layers
        self._weights: list[list[list[float]]] = []
        self._biases: list[list[float]] = []
        self._velocity_w: list[list[list[float]]] = []
        self._velocity_b: list[list[float]] = []
        self._forward_functions: list[ActivationForward] = [
            _ACTIVATION_FORWARD[layer.activation] for layer in self._layers
        ]
        self._derivative_functions: list[ActivationDerivative] = [
            _ACTIVATION_DERIVATIVE[layer.activation] for layer in self._layers
        ]
        self._dropout_scales: list[float] = [
            1.0 - layer.dropout if layer.dropout else 1.0 for layer in self._layers
        ]
        self._initialise_parameters()

    # ------------------------------------------------------------------
    # public API

    def reset_parameters(self, *, seed: int | None = None) -> None:
        """Re-initialise the parameter matrices."""

        if seed is not None:
            self._rng.seed(seed)
        elif self.spec.seed is not None:
            self._rng.seed(self.spec.seed)
        self._initialise_parameters()

    def train(
        self,
        samples: Sequence[TrainingSample] | Sequence[Mapping[str, object]],
        *,
        epochs: int = 10,
        batch_size: int = 8,
    ) -> list[TrainingMetrics]:
        """Run gradient descent and surface per-epoch metrics."""

        dataset = tuple(_coerce_sample(sample) for sample in samples)
        if not dataset:
            raise ValueError("training dataset must not be empty")
        if batch_size <= 0:
            raise ValueError("batch_size must be positive")
        batch_size = int(batch_size)
        for sample in dataset:
            self._validate_sample(sample)
        results: list[TrainingMetrics] = []
        for epoch in range(1, epochs + 1):
            loss, accuracy = self._train_epoch(dataset, batch_size=batch_size)
            results.append(
                TrainingMetrics(
                    epoch=epoch,
                    loss=loss,
                    accuracy=accuracy,
                    sample_count=len(dataset),
                )
            )
        return results

    def evaluate(
        self,
        samples: Sequence[TrainingSample] | Sequence[Mapping[str, object]],
    ) -> TrainingMetrics:
        """Evaluate loss and accuracy without updating parameters."""

        dataset = tuple(_coerce_sample(sample) for sample in samples)
        if not dataset:
            raise ValueError("evaluation dataset must not be empty")
        for sample in dataset:
            self._validate_sample(sample)
        total_loss = 0.0
        total_weight = 0.0
        correct_weight = 0.0
        for sample in dataset:
            prediction = self._forward(sample.features, training=False)
            loss = _loss(prediction, sample.target, self._layers[-1].activation)
            total_loss += loss * sample.weight
            total_weight += sample.weight
            correct_weight += _accuracy_weight(prediction, sample.target) * sample.weight
        average_loss = total_loss / total_weight
        accuracy = correct_weight / total_weight if total_weight else None
        return TrainingMetrics(
            epoch=0,
            loss=average_loss,
            accuracy=accuracy,
            sample_count=len(dataset),
            note="evaluation",
        )

    def predict(self, features: Sequence[float]) -> tuple[float, ...]:
        """Return the network output for ``features``."""

        vector = _to_float_sequence(features, name="features")
        if len(vector) != self.spec.input_dim:
            raise ValueError(
                f"expected feature vector of length {self.spec.input_dim}, got {len(vector)}"
            )
        prediction = self._forward(vector, training=False)
        return tuple(prediction)

    def summary(self) -> str:
        """Return a textual summary of the network architecture."""

        lines = ["DynamicDeepLearningEngine"]
        total_params = 0
        for index, layer in enumerate(self._layers):
            params = (layer.input_dim + 1) * layer.output_dim
            total_params += params
            lines.append(
                f"  [{index}] {layer.name}: {layer.input_dim} -> {layer.output_dim} "
                f"activation={layer.activation} dropout={layer.dropout:.2f} params={params}"
            )
        lines.append(f"Total parameters: {total_params}")
        lines.append(
            "Hyperparameters: "
            f"lr={self.spec.learning_rate:.4f}, momentum={self.spec.momentum:.2f}, "
            f"l2={self.spec.l2_regularisation:.4f}, clip={self.spec.gradient_clip}"
        )
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # internal helpers

    def _initialise_parameters(self) -> None:
        self._weights.clear()
        self._biases.clear()
        self._velocity_w.clear()
        self._velocity_b.clear()
        for layer in self._layers:
            scale = math.sqrt(2.0 / (layer.input_dim + layer.output_dim))
            weights = [
                [self._rng.uniform(-scale, scale) for _ in range(layer.input_dim)]
                for _ in range(layer.output_dim)
            ]
            biases = [self._rng.uniform(-scale, scale) for _ in range(layer.output_dim)]
            self._weights.append(weights)
            self._biases.append(biases)
            self._velocity_w.append([[0.0] * layer.input_dim for _ in range(layer.output_dim)])
            self._velocity_b.append([0.0] * layer.output_dim)

    def _forward(
        self,
        features: Sequence[float],
        *,
        training: bool,
        store_intermediate: bool = False,
    ) -> tuple[list[list[float]], list[list[float]], list[float]] | list[float]:
        vector = list(features)
        if len(vector) != self.spec.input_dim:
            raise ValueError("feature dimension mismatch with model spec")
        pre_activations: list[list[float]] = []
        activations: list[list[float]] = [vector]
        scales: list[float] = []
        for index, layer in enumerate(self._layers):
            weights = self._weights[index]
            biases = self._biases[index]
            z_values: list[float] = []
            for row, bias in zip(weights, biases):
                value = bias
                for weight, feature in zip(row, vector):
                    value += weight * feature
                z_values.append(value)
            activated = self._forward_functions[index](z_values)
            scale = self._dropout_scales[index]
            if scale != 1.0:
                activated = [value * scale for value in activated]
            pre_activations.append(z_values)
            scales.append(scale)
            vector = activated
            activations.append(vector)
        if store_intermediate:
            return pre_activations, activations, scales
        return vector

    def _validate_sample(self, sample: TrainingSample) -> None:
        if len(sample.features) != self.spec.input_dim:
            raise ValueError(
                f"sample features must have length {self.spec.input_dim}, "
                f"got {len(sample.features)}"
            )
        if len(sample.target) != self.spec.output_dim:
            raise ValueError(
                f"sample target must have length {self.spec.output_dim}, "
                f"got {len(sample.target)}"
            )

    def _train_epoch(self, dataset: Sequence[TrainingSample], *, batch_size: int) -> tuple[float, float | None]:
        working_set = list(dataset)
        if self.spec.shuffle_training:
            self._rng.shuffle(working_set)
        total_loss = 0.0
        total_weight = 0.0
        correct_weight = 0.0
        for batch_start in range(0, len(working_set), batch_size):
            batch = working_set[batch_start : batch_start + batch_size]
            batch_loss, batch_correct, batch_weight = self._train_batch(batch)
            if batch_weight == 0.0:
                continue
            total_loss += batch_loss
            total_weight += batch_weight
            correct_weight += batch_correct
        average_loss = total_loss / total_weight
        accuracy = correct_weight / total_weight if total_weight else None
        return average_loss, accuracy

    def _train_batch(self, batch: Sequence[TrainingSample]) -> tuple[float, float, float]:
        if not batch:
            return 0.0, 0.0, 0.0
        layer_count = len(self._layers)
        grad_w: list[list[list[float]]] = [
            [[0.0] * layer.input_dim for _ in range(layer.output_dim)]
            for layer in self._layers
        ]
        grad_b: list[list[float]] = [[0.0] * layer.output_dim for layer in self._layers]
        batch_loss = 0.0
        batch_correct = 0.0
        batch_weight = 0.0
        for sample in batch:
            pre_acts, acts, scales = self._forward(
                sample.features,
                training=True,
                store_intermediate=True,
            )
            prediction = acts[-1]
            loss = _loss(prediction, sample.target, self._layers[-1].activation)
            weighted_loss = loss * sample.weight
            batch_loss += weighted_loss
            batch_weight += sample.weight
            batch_correct += _accuracy_weight(prediction, sample.target) * sample.weight
            deltas = self._backpropagate(
                sample=sample,
                pre_activations=pre_acts,
                activations=acts,
                scales=scales,
            )
            for layer_index in range(layer_count):
                layer_input = acts[layer_index]
                layer_delta = deltas[layer_index]
                layer_grad_b = grad_b[layer_index]
                layer_grad_w = grad_w[layer_index]
                for output_index, delta in enumerate(layer_delta):
                    layer_grad_b[output_index] += delta
                    grad_row = layer_grad_w[output_index]
                    for input_index, activation in enumerate(layer_input):
                        grad_row[input_index] += delta * activation
        if batch_weight == 0.0:
            return 0.0, 0.0, 0.0
        self._apply_gradients(grad_w, grad_b, batch_weight)
        return batch_loss, batch_correct, batch_weight

    def _backpropagate(
        self,
        *,
        sample: TrainingSample,
        pre_activations: Sequence[Sequence[float]],
        activations: Sequence[Sequence[float]],
        scales: Sequence[float],
    ) -> list[list[float]]:
        deltas: list[list[float]] = [[0.0] * layer.output_dim for layer in self._layers]
        last_index = len(self._layers) - 1
        final_activation = self._layers[-1].activation
        prediction = activations[-1]
        target = sample.target
        if final_activation == "softmax":
            # Cross-entropy gradient
            deltas[last_index] = [
                (prediction[i] - target[i]) * sample.weight for i in range(len(prediction))
            ]
        else:
            derivatives = self._derivative_functions[last_index](
                prediction, pre_activations[last_index]
            )
            scale = scales[last_index]
            if scale != 1.0:
                derivatives = [value * scale for value in derivatives]
            factor = 2.0 / len(prediction)
            deltas[last_index] = [
                (prediction[i] - target[i]) * derivatives[i] * factor * sample.weight
                for i in range(len(prediction))
            ]
        for index in range(last_index - 1, -1, -1):
            next_layer = self._layers[index + 1]
            derivatives = self._derivative_functions[index](
                activations[index + 1], pre_activations[index]
            )
            scale = scales[index]
            if scale != 1.0:
                derivatives = [value * scale for value in derivatives]
            for neuron in range(self._layers[index].output_dim):
                error = 0.0
                for next_neuron in range(next_layer.output_dim):
                    error += deltas[index + 1][next_neuron] * self._weights[index + 1][next_neuron][neuron]
                deltas[index][neuron] = error * derivatives[neuron]
        return deltas

    def _apply_gradients(
        self,
        grad_w: Sequence[Sequence[Sequence[float]]],
        grad_b: Sequence[Sequence[float]],
        batch_weight: float,
    ) -> None:
        learning_rate = self.spec.learning_rate
        momentum = self.spec.momentum
        l2 = self.spec.l2_regularisation
        clip = self.spec.gradient_clip
        inv_batch_weight = 1.0 / batch_weight
        use_momentum = momentum != 0.0
        use_decay = l2 != 0.0
        use_clip = clip is not None
        if use_clip:
            assert clip is not None
            lower, upper = -clip, clip
        else:
            lower = upper = 0.0  # sentinel values, unused when clipping disabled
        for layer_index, layer in enumerate(self._layers):
            weights = self._weights[layer_index]
            biases = self._biases[layer_index]
            vel_w = self._velocity_w[layer_index]
            vel_b = self._velocity_b[layer_index]
            for output_index in range(layer.output_dim):
                bias_grad = grad_b[layer_index][output_index] * inv_batch_weight
                if use_decay:
                    bias_grad += l2 * biases[output_index]
                if use_clip:
                    bias_grad = _clip(bias_grad, lower, upper)
                update_b = -learning_rate * bias_grad
                if use_momentum:
                    vel_b[output_index] = momentum * vel_b[output_index] + update_b
                    biases[output_index] += vel_b[output_index]
                else:
                    biases[output_index] += update_b
                for input_index in range(layer.input_dim):
                    weight_grad = (
                        grad_w[layer_index][output_index][input_index] * inv_batch_weight
                    )
                    if use_decay:
                        weight_grad += l2 * weights[output_index][input_index]
                    if use_clip:
                        weight_grad = _clip(weight_grad, lower, upper)
                    update_w = -learning_rate * weight_grad
                    if use_momentum:
                        vel_w[output_index][input_index] = (
                            momentum * vel_w[output_index][input_index] + update_w
                        )
                        weights[output_index][input_index] += vel_w[output_index][input_index]
                    else:
                        weights[output_index][input_index] += update_w


# ---------------------------------------------------------------------------
# loss and metric helpers


def _loss(prediction: Sequence[float], target: Sequence[float], activation: str) -> float:
    if activation == "softmax":
        epsilon = 1e-9
        return -sum(t * math.log(max(p, epsilon)) for p, t in zip(target, prediction))
    squared = [(p - t) * (p - t) for p, t in zip(prediction, target)]
    return sum(squared) / len(squared)


def _accuracy_weight(prediction: Sequence[float], target: Sequence[float]) -> float:
    if len(prediction) != len(target):
        return 0.0
    if len(prediction) == 1:
        predicted_label = 1 if prediction[0] >= 0.5 else 0
        target_label = 1 if target[0] >= 0.5 else 0
        return 1.0 if predicted_label == target_label else 0.0
    predicted_index = max(range(len(prediction)), key=prediction.__getitem__)
    target_index = max(range(len(target)), key=target.__getitem__)
    return 1.0 if predicted_index == target_index else 0.0


def _clip(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _coerce_sample(sample: TrainingSample | Mapping[str, object]) -> TrainingSample:
    if isinstance(sample, TrainingSample):
        return sample
    if not isinstance(sample, Mapping):
        raise TypeError("samples must be TrainingSample instances or mappings")
    payload = dict(sample)
    return TrainingSample(
        features=payload.get("features", ()),
        target=payload.get("target", ()),
        weight=payload.get("weight", 1.0),
        metadata=payload.get("metadata"),
    )
