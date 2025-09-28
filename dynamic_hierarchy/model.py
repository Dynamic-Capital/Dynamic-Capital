"""Conceptual models for representing hierarchical systems.

The module distils common language around hierarchies into structured data
objects that other parts of the codebase can import.  The goal is to offer a
clear, declarative description of how hierarchies function, what
characteristics they exhibit, and how different organisational models
interpret the hierarchy concept.

The data is intentionally lightweight – a hierarchy is represented as a set of
`dataclasses` and frozen collections so it can be serialised, documented, or
rendered in APIs without additional transformation logic.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = [
    "HIERARCHY_MODEL",
    "HierarchyCharacteristic",
    "HierarchyExample",
    "HierarchyModel",
    "OrganizationalHierarchy",
    "organizational_hierarchy_catalogue",
]


@dataclass(frozen=True, slots=True)
class HierarchyCharacteristic:
    """Describes an attribute that commonly appears in hierarchical systems."""

    name: str
    description: str


@dataclass(frozen=True, slots=True)
class HierarchyExample:
    """Concrete illustration of where a hierarchy is used."""

    domain: str
    description: str


@dataclass(frozen=True, slots=True)
class OrganizationalHierarchy:
    """Represents a type of organisational hierarchy structure."""

    name: str
    summary: str


@dataclass(frozen=True, slots=True)
class HierarchyModel:
    """Curated model capturing the essence of hierarchical systems."""

    definition: str
    characteristics: tuple[HierarchyCharacteristic, ...]
    examples: tuple[HierarchyExample, ...]
    organizational_hierarchies: tuple[OrganizationalHierarchy, ...]


hierarchy_characteristics: tuple[HierarchyCharacteristic, ...] = (
    HierarchyCharacteristic(
        name="Clear levels",
        description=(
            "Hierarchies are composed of distinct layers that define how "
            "responsibility and influence are distributed."
        ),
    ),
    HierarchyCharacteristic(
        name="Chain of command",
        description=(
            "Authority flows downward from higher tiers to lower tiers, "
            "establishing who directs decisions at each level."
        ),
    ),
    HierarchyCharacteristic(
        name="Structured communication",
        description=(
            "Information follows predictable pathways, often moving "
            "between direct supervisors and their reports to maintain "
            "orderly coordination."
        ),
    ),
    HierarchyCharacteristic(
        name="Accountability",
        description=(
            "Roles carry explicit responsibilities, making it easier to "
            "track performance and assign ownership of outcomes."
        ),
    ),
)


hierarchy_examples: tuple[HierarchyExample, ...] = (
    HierarchyExample(
        domain="Organisations",
        description=(
            "Companies often structure leadership from executives through "
            "managers to individual contributors."
        ),
    ),
    HierarchyExample(
        domain="Biology",
        description=(
            "The Linnaean taxonomy orders life into nested groupings such as "
            "kingdom, phylum, class, and species."
        ),
    ),
    HierarchyExample(
        domain="Social structures",
        description=(
            "Societies can stratify individuals by class, status, or caste."
        ),
    ),
    HierarchyExample(
        domain="Military",
        description=(
            "Ranks like general, colonel, captain, and private define command "
            "relationships."
        ),
    ),
    HierarchyExample(
        domain="Computer science",
        description=(
            "File systems use directories and sub-directories to organise "
            "data in tree structures."
        ),
    ),
)


organizational_hierarchy_catalogue: tuple[OrganizationalHierarchy, ...] = (
    OrganizationalHierarchy(
        name="Functional hierarchy",
        summary=(
            "Groups employees by speciality or department, with each function "
            "maintaining its own management ladder."
        ),
    ),
    OrganizationalHierarchy(
        name="Divisional hierarchy",
        summary=(
            "Organises the company into semi-autonomous divisions around "
            "products, geographies, or markets."
        ),
    ),
    OrganizationalHierarchy(
        name="Matrix hierarchy",
        summary=(
            "Creates a grid of dual reporting lines, such as project and "
            "functional managers overseeing the same employee."
        ),
    ),
    OrganizationalHierarchy(
        name="Flat hierarchy",
        summary=(
            "Minimises middle management to promote direct communication and "
            "shared decision making."
        ),
    ),
)


hierarchy_definition = (
    "A hierarchy is a system that organises people, concepts, or objects into "
    "tiers where higher levels have greater authority or priority than those "
    "below them."
)


HIERARCHY_MODEL = HierarchyModel(
    definition=hierarchy_definition,
    characteristics=hierarchy_characteristics,
    examples=hierarchy_examples,
    organizational_hierarchies=organizational_hierarchy_catalogue,
)

