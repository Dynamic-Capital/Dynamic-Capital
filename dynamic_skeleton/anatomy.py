"""Reference data for the Dynamic Skeleton domain."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

__all__ = [
    "SkeletalSection",
    "SkeletalGroup",
    "SkeletalBone",
    "AXIAL_SKELETON",
    "APPENDICULAR_SKELETON",
    "CORE_SKELETAL_FUNCTIONS",
    "skeleton_body_overview",
]


@dataclass(frozen=True, slots=True)
class SkeletalBone:
    """Describe an individual named bone and how many exist."""

    name: str
    count: int


@dataclass(frozen=True, slots=True)
class SkeletalGroup:
    """Group a collection of bones under a shared label."""

    name: str
    bones: tuple[SkeletalBone, ...]

    @property
    def count(self) -> int:
        return sum(bone.count for bone in self.bones)


@dataclass(frozen=True, slots=True)
class SkeletalSection:
    """Represent a high-level region of the skeleton."""

    name: str
    groups: tuple[SkeletalGroup, ...]

    @property
    def count(self) -> int:
        return sum(group.count for group in self.groups)


def _build_group(name: str, entries: Mapping[str, int]) -> SkeletalGroup:
    return SkeletalGroup(
        name=name,
        bones=tuple(SkeletalBone(bone, count) for bone, count in entries.items()),
    )


AXIAL_SKELETON: tuple[SkeletalSection, ...] = (
    SkeletalSection(
        name="Skull",
        groups=(
            _build_group(
                "Cranial bones",
                {
                    "Frontal": 1,
                    "Parietal": 2,
                    "Temporal": 2,
                    "Occipital": 1,
                    "Sphenoid": 1,
                    "Ethmoid": 1,
                },
            ),
            _build_group(
                "Facial bones",
                {
                    "Maxilla": 2,
                    "Zygomatic": 2,
                    "Nasal": 2,
                    "Lacrimal": 2,
                    "Palatine": 2,
                    "Inferior nasal concha": 2,
                    "Mandible": 1,
                    "Vomer": 1,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Middle ear ossicles",
        groups=(
            _build_group(
                "Auditory bones",
                {
                    "Malleus": 2,
                    "Incus": 2,
                    "Stapes": 2,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Hyoid",
        groups=(
            _build_group(
                "Hyoid bone",
                {
                    "Hyoid": 1,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Vertebral column",
        groups=(
            _build_group(
                "Vertebrae",
                {
                    "Cervical": 7,
                    "Thoracic": 12,
                    "Lumbar": 5,
                    "Sacrum": 1,
                    "Coccyx": 1,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Thoracic cage",
        groups=(
            _build_group(
                "Thoracic bones",
                {
                    "Sternum": 1,
                    "Ribs": 24,
                },
            ),
        ),
    ),
)

APPENDICULAR_SKELETON: tuple[SkeletalSection, ...] = (
    SkeletalSection(
        name="Pectoral girdle",
        groups=(
            _build_group(
                "Shoulder bones",
                {
                    "Clavicle": 2,
                    "Scapula": 2,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Upper limbs",
        groups=(
            _build_group(
                "Arm bones",
                {
                    "Humerus": 2,
                    "Radius": 2,
                    "Ulna": 2,
                },
            ),
            _build_group(
                "Hand bones",
                {
                    "Carpals": 16,
                    "Metacarpals": 10,
                    "Phalanges": 28,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Pelvic girdle",
        groups=(
            _build_group(
                "Hip bones",
                {
                    "Hip bone": 2,
                },
            ),
        ),
    ),
    SkeletalSection(
        name="Lower limbs",
        groups=(
            _build_group(
                "Leg bones",
                {
                    "Femur": 2,
                    "Patella": 2,
                    "Tibia": 2,
                    "Fibula": 2,
                },
            ),
            _build_group(
                "Foot bones",
                {
                    "Tarsals": 14,
                    "Metatarsals": 10,
                    "Phalanges": 28,
                },
            ),
        ),
    ),
)

CORE_SKELETAL_FUNCTIONS: tuple[dict[str, str], ...] = (
    {
        "name": "Support and structure",
        "description": (
            "Bones provide the rigid framework that supports body weight "
            "and maintains overall shape, including the spine, ribs, and pelvis."
        ),
    },
    {
        "name": "Protection",
        "description": (
            "The skull, ribs, vertebrae, and pelvis shield critical organs "
            "such as the brain, heart, lungs, and pelvic organs."
        ),
    },
    {
        "name": "Movement",
        "description": (
            "Bones act as levers for muscles, with joints and tendons "
            "enabling a wide range of motion across the body."
        ),
    },
    {
        "name": "Blood cell production",
        "description": (
            "Red bone marrow, especially in the pelvis, vertebrae, and sternum, "
            "produces red and white blood cells along with platelets."
        ),
    },
    {
        "name": "Mineral storage",
        "description": (
            "Skeletal tissue stores calcium and phosphorus, releasing them to "
            "maintain homeostatic balance when needed."
        ),
    },
    {
        "name": "Energy storage",
        "description": (
            "Yellow bone marrow houses adipocytes that can be mobilised as an "
            "energy reserve."
        ),
    },
    {
        "name": "Hearing and speech",
        "description": (
            "The middle ear ossicles transmit sound while the hyoid bone supports "
            "tongue movement for speech and swallowing."
        ),
    },
)


def _summarise_sections(sections: Sequence[SkeletalSection]) -> dict[str, object]:
    return {
        "total_bones": sum(section.count for section in sections),
        "sections": tuple(
            {
                "name": section.name,
                "total": section.count,
                "groups": tuple(
                    {
                        "name": group.name,
                        "total": group.count,
                        "bones": tuple(
                            {"name": bone.name, "count": bone.count}
                            for bone in group.bones
                        ),
                    }
                    for group in section.groups
                ),
            }
            for section in sections
        ),
    }


def skeleton_body_overview() -> dict[str, object]:
    """Return bone counts and functional context for the skeleton."""

    axial = _summarise_sections(AXIAL_SKELETON)
    appendicular = _summarise_sections(APPENDICULAR_SKELETON)
    totals = {
        "axial": axial["total_bones"],
        "appendicular": appendicular["total_bones"],
        "combined": axial["total_bones"] + appendicular["total_bones"],
    }
    ratio = (
        totals["axial"] / totals["appendicular"]
        if totals["appendicular"]
        else 0.0
    )
    return {
        "axial": axial,
        "appendicular": appendicular,
        "totals": totals,
        "axial_to_appendicular_ratio": ratio,
        "core_functions": CORE_SKELETAL_FUNCTIONS,
    }
