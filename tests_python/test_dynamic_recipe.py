"""Tests for the dynamic recipe engine."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - import path hygiene for pytest
    sys.path.append(str(PROJECT_ROOT))

from dynamic_recipe import (
    DynamicRecipeEngine,
    RecipeContext,
    RecipeIngredient,
    RecipeProfile,
    RecipeStep,
)


@pytest.fixture
def sample_recipes() -> tuple[RecipeProfile, ...]:
    """Provides a trio of recipes for scenario testing."""

    quick_bowl = RecipeProfile(
        name="Quick Chickpea Bowl",
        summary="A speedy bowl with warm chickpeas and bright greens.",
        tags=("vegan", "spring"),
        difficulty=2,
        total_time_minutes=25,
        servings=2,
        ingredients=(
            RecipeIngredient("chickpeas", 1.0, "cup"),
            RecipeIngredient("spinach", 2.0, "cup"),
            RecipeIngredient("quinoa", 1.0, "cup"),
            RecipeIngredient("lemon", 0.5, "unit"),
        ),
        steps=(
            RecipeStep("Roast chickpeas with spices", 15, focus="roast"),
            RecipeStep("Assemble greens and grains", 5),
        ),
        nutrition={"calories": 520.0, "protein": 18.0},
    )

    stuffed_potato = RecipeProfile(
        name="Stuffed Sweet Potato",
        summary="Loaded sweet potatoes with tahini drizzle.",
        tags=("vegan", "comfort", "spring"),
        difficulty=3,
        total_time_minutes=40,
        servings=2,
        ingredients=(
            RecipeIngredient("sweet potato", 2.0, "unit"),
            RecipeIngredient("black beans", 1.0, "cup"),
            RecipeIngredient("spinach", 1.0, "cup"),
            RecipeIngredient("tahini", 0.25, "cup", pantry=True),
        ),
        steps=(
            RecipeStep("Roast the potatoes", 25),
            RecipeStep("Prepare the filling", 10),
            RecipeStep("Assemble and drizzle tahini", 5),
        ),
        nutrition={"calories": 600.0, "protein": 20.0},
    )

    anchovy_pasta = RecipeProfile(
        name="Anchovy Pasta",
        summary="Pantry pasta with anchovy butter.",
        tags=("dinner",),
        difficulty=2,
        total_time_minutes=20,
        servings=2,
        ingredients=(
            RecipeIngredient("spaghetti", 0.5, "lb"),
            RecipeIngredient("anchovy", 4.0, "fillet"),
            RecipeIngredient("garlic", 3.0, "clove"),
        ),
        steps=(
            RecipeStep("Cook pasta", 10),
            RecipeStep("Make anchovy butter", 5),
            RecipeStep("Toss and serve", 5),
        ),
        nutrition={"calories": 680.0, "protein": 22.0},
    )

    return (quick_bowl, stuffed_potato, anchovy_pasta)


def test_plan_prioritises_pantry_and_filters_dislikes(sample_recipes: tuple[RecipeProfile, ...]) -> None:
    context = RecipeContext(
        servings=2,
        dietary_styles=("vegan",),
        disliked_ingredients=("anchovy",),
        available_ingredients={"chickpeas": 1.0, "spinach": 3.0, "quinoa": 1.0, "black beans": 0.5},
        time_budget_minutes=30,
        skill_level=2,
        target_calories=550,
        meal_slots=("lunch", "dinner"),
        season="spring",
    )
    engine = DynamicRecipeEngine(sample_recipes)

    plan = engine.plan(context, limit=2)

    assert [suggestion.name for suggestion in plan.suggestions] == [
        "Quick Chickpea Bowl",
        "Stuffed Sweet Potato",
    ]
    assert plan.suggestions[0].match_score > plan.suggestions[1].match_score
    assert "time budget" in plan.suggestions[0].reason
    assert any("calorie" in adjustment for adjustment in plan.suggestions[1].adjustments)

    shopping = {(item.name, item.unit): item.quantity for item in plan.shopping_list}
    assert shopping == {
        ("black beans", "cup"): pytest.approx(0.5, rel=1e-6),
        ("lemon", "unit"): pytest.approx(0.5, rel=1e-6),
        ("sweet potato", "unit"): pytest.approx(2.0, rel=1e-6),
    }
    assert plan.prep_notes  # ensures at least one prep note was generated
    assert "Average calories per serving" in plan.nutrition_focus


def test_plan_scales_servings_and_computes_shopping_list() -> None:
    tofu_recipe = RecipeProfile(
        name="Sesame Tofu Stir Fry",
        summary="Colourful tofu stir fry with ginger glaze.",
        tags=("vegan", "gluten-free"),
        difficulty=2,
        total_time_minutes=35,
        servings=2,
        ingredients=(
            RecipeIngredient("tofu", 0.4, "kg"),
            RecipeIngredient("broccoli", 1.0, "head"),
            RecipeIngredient("rice", 1.5, "cup", pantry=True),
            RecipeIngredient("ginger", 0.05, "kg"),
        ),
        steps=(
            RecipeStep("Press and cube tofu", 10),
            RecipeStep("Stir fry vegetables", 15),
            RecipeStep("Steam rice", 20),
        ),
        nutrition={"calories": 480.0, "protein": 22.0},
    )
    engine = DynamicRecipeEngine((tofu_recipe,))
    context = RecipeContext(
        servings=4,
        dietary_styles=("gluten-free",),
        disliked_ingredients=(),
        available_ingredients={"tofu": 0.5, "broccoli": 1.0, "rice": 2.0},
        time_budget_minutes=30,
        skill_level=1,
        target_calories=500,
        meal_slots=("dinner",),
    )

    plan = engine.plan(context)

    assert [suggestion.name for suggestion in plan.suggestions] == ["Sesame Tofu Stir Fry"]
    assert any("Scale ingredients by x2.00" in adjustment for adjustment in plan.suggestions[0].adjustments)

    shopping = {item.name: item.quantity for item in plan.shopping_list}
    assert shopping == {
        "broccoli": pytest.approx(1.0, rel=1e-6),
        "ginger": pytest.approx(0.1, rel=1e-6),
        "tofu": pytest.approx(0.3, rel=1e-6),
    }
    assert any("prep" in note.lower() for note in plan.prep_notes)
    assert "calorie" in plan.nutrition_focus.lower()
