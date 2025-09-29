"""Dynamic recipe orchestration engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from statistics import fmean
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "RecipeIngredient",
    "RecipeStep",
    "RecipeProfile",
    "RecipeContext",
    "RecipeSuggestion",
    "ShoppingItem",
    "RecipePlan",
    "DynamicRecipeEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_token(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_quantity(value: float | int) -> float:
    quantity = float(value)
    if quantity < 0:
        raise ValueError("quantity must not be negative")
    return quantity


def _normalise_positive_int(value: int) -> int:
    integer = int(value)
    if integer <= 0:
        raise ValueError("value must be positive")
    return integer


def _normalise_duration(value: int) -> int:
    integer = int(value)
    if integer < 0:
        raise ValueError("duration must be >= 0")
    return integer


def _normalise_available(mapping: Mapping[str, float] | None) -> dict[str, float]:
    if not mapping:
        return {}
    normalised: dict[str, float] = {}
    for key, value in mapping.items():
        name = _normalise_token(key)
        amount = max(float(value), 0.0)
        normalised[name] = amount
    return normalised


def _unique_ordered(items: Iterable[str]) -> tuple[str, ...]:
    normalised: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = item.strip()
        if not cleaned:
            continue
        if cleaned in seen:
            continue
        seen.add(cleaned)
        normalised.append(cleaned)
    return tuple(normalised)


def _round_quantity(value: float) -> float:
    return round(value + 1e-9, 2)


# ---------------------------------------------------------------------------
# dataclasses representing recipe primitives


@dataclass(slots=True)
class RecipeIngredient:
    """Ingredient required by a recipe."""

    name: str
    quantity: float
    unit: str
    category: str = "general"
    pantry: bool = False
    notes: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_token(self.name)
        self.quantity = _normalise_quantity(self.quantity)
        self.unit = _normalise_text(self.unit)
        self.category = _normalise_optional(self.category) or "general"
        self.pantry = bool(self.pantry)
        self.notes = _normalise_optional(self.notes)
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class RecipeStep:
    """Step required to execute the recipe."""

    description: str
    duration_minutes: int
    focus: str | None = None

    def __post_init__(self) -> None:
        self.description = _normalise_text(self.description)
        self.duration_minutes = _normalise_duration(self.duration_minutes)
        self.focus = _normalise_optional(self.focus)


@dataclass(slots=True)
class RecipeProfile:
    """Canonical description of a recipe in the engine."""

    name: str
    summary: str
    ingredients: tuple[RecipeIngredient, ...]
    steps: tuple[RecipeStep, ...]
    tags: tuple[str, ...] = field(default_factory=tuple)
    difficulty: int = 2
    total_time_minutes: int = 30
    servings: int = 2
    nutrition: Mapping[str, float] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.summary = _normalise_text(self.summary)
        if not self.ingredients:
            raise ValueError("recipe must declare at least one ingredient")
        if not self.steps:
            raise ValueError("recipe must declare at least one step")
        self.ingredients = tuple(self.ingredients)
        self.steps = tuple(self.steps)
        self.tags = _normalise_tags(self.tags)
        self.difficulty = max(1, int(self.difficulty))
        self.total_time_minutes = _normalise_duration(self.total_time_minutes)
        self.servings = _normalise_positive_int(self.servings)
        if self.nutrition is None:
            self.nutrition = {}
        else:
            self.nutrition = {key.strip().lower(): float(value) for key, value in self.nutrition.items()}

    @property
    def calorie_per_serving(self) -> float | None:
        calories = self.nutrition.get("calories") if self.nutrition else None
        if calories is None:
            return None
        return float(calories)


@dataclass(slots=True)
class RecipeContext:
    """Context describing pantry constraints and preferences."""

    servings: int
    dietary_styles: tuple[str, ...] = field(default_factory=tuple)
    disliked_ingredients: tuple[str, ...] = field(default_factory=tuple)
    available_ingredients: Mapping[str, float] | None = None
    time_budget_minutes: int = 45
    skill_level: int = 2
    target_calories: int | None = None
    meal_slots: tuple[str, ...] = field(default_factory=lambda: ("dinner",))
    season: str | None = None

    def __post_init__(self) -> None:
        self.servings = _normalise_positive_int(self.servings)
        self.dietary_styles = _normalise_tags(self.dietary_styles)
        self.disliked_ingredients = _normalise_tags(self.disliked_ingredients)
        self.available_ingredients = _normalise_available(self.available_ingredients)
        self.time_budget_minutes = _normalise_positive_int(self.time_budget_minutes)
        self.skill_level = max(1, int(self.skill_level))
        self.target_calories = int(self.target_calories) if self.target_calories else None
        self.meal_slots = tuple(slot or "dinner" for slot in _unique_ordered(self.meal_slots) or ("dinner",))
        self.season = _normalise_optional(self.season)


@dataclass(slots=True)
class RecipeSuggestion:
    """Suggestion returned by the recipe engine."""

    name: str
    summary: str
    match_score: float
    schedule: str
    reason: str
    adjustments: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.summary = _normalise_text(self.summary)
        self.schedule = _normalise_text(self.schedule)
        self.reason = _normalise_text(self.reason)
        self.match_score = float(self.match_score)
        self.adjustments = tuple(self.adjustments)


@dataclass(slots=True)
class ShoppingItem:
    """Represents a shopping list entry derived from the plan."""

    name: str
    quantity: float
    unit: str

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.quantity = _normalise_quantity(self.quantity)
        self.unit = _normalise_text(self.unit)


@dataclass(slots=True)
class RecipePlan:
    """Final plan generated by the recipe engine."""

    suggestions: tuple[RecipeSuggestion, ...]
    shopping_list: tuple[ShoppingItem, ...]
    prep_notes: tuple[str, ...]
    nutrition_focus: str

    def __post_init__(self) -> None:
        self.suggestions = tuple(self.suggestions)
        self.shopping_list = tuple(self.shopping_list)
        self.prep_notes = _unique_ordered(self.prep_notes)
        self.nutrition_focus = _normalise_text(self.nutrition_focus)


# ---------------------------------------------------------------------------
# internal evaluation structures


@dataclass(slots=True)
class _RecipeEvaluation:
    profile: RecipeProfile
    score: float
    reason: str
    adjustments: tuple[str, ...]
    prep_tip: str | None


# ---------------------------------------------------------------------------
# main engine


class DynamicRecipeEngine:
    """Engine that composes contextual recipe plans."""

    def __init__(self, recipes: Sequence[RecipeProfile]):
        if not recipes:
            raise ValueError("at least one recipe profile is required")
        self._recipes = tuple(recipes)

    # public API -------------------------------------------------------------

    def plan(self, context: RecipeContext, *, limit: int = 3) -> RecipePlan:
        if limit <= 0:
            raise ValueError("limit must be positive")
        disliked = set(context.disliked_ingredients)
        dietary_styles = set(context.dietary_styles)
        evaluations = [
            evaluation
            for recipe in self._recipes
            if (
                evaluation := self._evaluate_recipe(
                    recipe,
                    context,
                    disliked,
                    dietary_styles,
                )
            )
            is not None
        ]
        if not evaluations:
            empty_message = "No recipes matched the provided context."
            return RecipePlan((), (), (), empty_message)
        evaluations.sort(key=lambda item: (-item.score, item.profile.name.lower()))
        selected = evaluations[:limit]
        suggestions: list[RecipeSuggestion] = []
        prep_notes: list[str] = []
        all_missing: list[ShoppingItem] = []
        slots = context.meal_slots
        inventory = dict(context.available_ingredients)
        for index, evaluation in enumerate(selected):
            recipe = evaluation.profile
            schedule = slots[min(index, len(slots) - 1)]
            adjustments = list(evaluation.adjustments)
            if context.servings != recipe.servings:
                factor = context.servings / recipe.servings
                adjustments.append(
                    f"Scale ingredients by x{factor:.2f} to serve {context.servings} people."
                )
            suggestion = RecipeSuggestion(
                name=recipe.name,
                summary=recipe.summary,
                match_score=round(evaluation.score, 3),
                schedule=schedule,
                reason=evaluation.reason,
                adjustments=tuple(adjustments),
            )
            suggestions.append(suggestion)
            if evaluation.prep_tip:
                prep_notes.append(evaluation.prep_tip)
            missing_items = self._compute_missing(recipe, inventory, context.servings)
            all_missing.extend(missing_items)
        shopping_list = self._aggregate_shopping(all_missing)
        nutrition_focus = self._build_nutrition_summary([item.profile for item in selected], context)
        return RecipePlan(
            tuple(suggestions),
            shopping_list,
            tuple(prep_notes),
            nutrition_focus,
        )

    # scoring helpers --------------------------------------------------------

    def _evaluate_recipe(
        self,
        recipe: RecipeProfile,
        context: RecipeContext,
        disliked: set[str],
        dietary_styles: set[str],
    ) -> _RecipeEvaluation | None:
        recipe_tags = set(recipe.tags)
        recipe_ingredients = {ingredient.name for ingredient in recipe.ingredients}
        if recipe_ingredients & disliked:
            return None
        if dietary_styles and not dietary_styles.issubset(recipe_tags):
            return None
        coverage = self._coverage_ratio(recipe, context)
        time_factor, time_reason = self._time_factor(recipe, context)
        difficulty_factor, difficulty_reason = self._difficulty_factor(recipe, context)
        calorie_factor, calorie_adjustment = self._calorie_factor(recipe, context)
        season_bonus = 0.3 if context.season and context.season.lower() in recipe.tags else 0.0
        score = 1.0 + (coverage * 1.5) + time_factor + difficulty_factor + calorie_factor + season_bonus
        reason_parts = []
        if coverage >= 0.8:
            reason_parts.append("uses mostly pantry staples")
        elif coverage >= 0.4:
            reason_parts.append("balances pantry items with fresh produce")
        else:
            reason_parts.append("introduces new flavours for variety")
        reason_parts.append(time_reason)
        reason_parts.append(difficulty_reason)
        if season_bonus > 0:
            reason_parts.append("captures seasonal ingredients")
        reason = "; ".join(reason_parts)
        adjustments = []
        if calorie_adjustment:
            adjustments.append(calorie_adjustment)
        prep_tip = None
        if time_factor < 0.9:
            prep_tip = f"Prep components for {recipe.name} ahead to stay within {context.time_budget_minutes} minutes."
        elif difficulty_factor < 0.9:
            prep_tip = f"Review the key technique for {recipe.name} to build confidence."
        elif coverage < 0.5:
            prep_tip = f"Batch prep pantry staples to support {recipe.name}."
        return _RecipeEvaluation(recipe, score, reason, tuple(adjustments), prep_tip)

    def _coverage_ratio(self, recipe: RecipeProfile, context: RecipeContext) -> float:
        scale = context.servings / recipe.servings
        required = 0.0
        available = 0.0
        for ingredient in recipe.ingredients:
            if ingredient.pantry:
                continue
            needed = ingredient.quantity * scale
            required += needed
            available += min(context.available_ingredients.get(ingredient.name, 0.0), needed)
        if required == 0:
            return 1.0
        return max(0.0, min(1.0, available / required))

    def _time_factor(self, recipe: RecipeProfile, context: RecipeContext) -> tuple[float, str]:
        if recipe.total_time_minutes <= context.time_budget_minutes:
            return 1.0, "fits within the time budget"
        overage = recipe.total_time_minutes - context.time_budget_minutes
        ratio = max(0.0, 1.0 - (overage / max(context.time_budget_minutes, 1)))
        return ratio, "may require extra prep time"

    def _difficulty_factor(self, recipe: RecipeProfile, context: RecipeContext) -> tuple[float, str]:
        gap = recipe.difficulty - context.skill_level
        if gap <= 0:
            return 1.0, "matches the current skill level"
        score = max(0.0, 1.0 - (0.25 * gap))
        return score, "gently stretches cooking skills"

    def _calorie_factor(self, recipe: RecipeProfile, context: RecipeContext) -> tuple[float, str | None]:
        if context.target_calories is None:
            return (0.5 if recipe.calorie_per_serving else 0.0), None
        calories = recipe.calorie_per_serving
        if calories is None:
            return 0.0, "Add a hearty side to reach the calorie target."
        target = float(context.target_calories)
        delta = abs(calories - target)
        ratio = max(0.0, 1.0 - (delta / max(target, 1.0)))
        if delta <= target * 0.1:
            if calories > target:
                return ratio + 0.3, "Keep portions moderate to stay on the calorie target."
            if calories < target:
                return ratio + 0.3, "Pair with energy-dense sides to meet the calorie goal."
            return ratio + 0.3, None
        if calories < target:
            return ratio, "Add a wholesome side to hit the calorie goal."
        return ratio, "Balance with a crisp salad to lighten the meal."

    # aggregation helpers ----------------------------------------------------

    def _compute_missing(
        self,
        recipe: RecipeProfile,
        inventory: MutableMapping[str, float],
        servings: int,
    ) -> tuple[ShoppingItem, ...]:
        scale = servings / recipe.servings
        missing: list[ShoppingItem] = []
        for ingredient in recipe.ingredients:
            if ingredient.pantry:
                continue
            required = ingredient.quantity * scale
            available = inventory.get(ingredient.name, 0.0)
            if available >= required:
                inventory[ingredient.name] = available - required
                continue
            shortfall = required - available
            inventory[ingredient.name] = 0.0
            if shortfall > 0:
                missing.append(
                    ShoppingItem(
                        name=ingredient.name,
                        quantity=_round_quantity(shortfall),
                        unit=ingredient.unit,
                    )
                )
        return tuple(missing)

    def _aggregate_shopping(self, items: Sequence[ShoppingItem]) -> tuple[ShoppingItem, ...]:
        if not items:
            return ()
        combined: dict[tuple[str, str], float] = {}
        for item in items:
            key = (item.name.lower(), item.unit)
            combined[key] = combined.get(key, 0.0) + item.quantity
        aggregated = [
            ShoppingItem(name=key[0], quantity=_round_quantity(quantity), unit=key[1])
            for key, quantity in combined.items()
        ]
        aggregated.sort(key=lambda entry: entry.name)
        return tuple(aggregated)

    def _build_nutrition_summary(
        self,
        recipes: Sequence[RecipeProfile],
        context: RecipeContext,
    ) -> str:
        if not recipes:
            return "No matching recipes were selected."
        calorie_values = [profile.calorie_per_serving for profile in recipes if profile.calorie_per_serving is not None]
        protein_values = [profile.nutrition.get("protein") for profile in recipes if profile.nutrition.get("protein") is not None]
        parts: list[str] = []
        if calorie_values:
            avg_calories = fmean(calorie_values)
            calorie_message = f"Average calories per serving: {avg_calories:.0f}."
            if context.target_calories is not None:
                delta = avg_calories - context.target_calories
                if abs(delta) <= context.target_calories * 0.1:
                    calorie_message += " Aligned with the target range."
                elif delta > 0:
                    calorie_message += " Slightly above the target."
                else:
                    calorie_message += " Slightly below the target."
            parts.append(calorie_message)
        if protein_values:
            avg_protein = fmean(float(value) for value in protein_values)
            parts.append(f"Protein focus: {avg_protein:.1f}g per serving.")
        if not parts:
            parts.append("Nutritional insights are unavailable for the current selection.")
        return " ".join(parts)
