from __future__ import annotations

from algorithms.python.dynamic_capital_principles import (
    PLAYBOOK_OF_PRINCIPLES,
    SUCCESS_FORMULA,
    PrincipleSection,
    build_dqa_principles,
    build_dqa_rules,
    build_principle_sections,
)


def test_playbook_structure():
    sections = build_principle_sections()
    assert sections is PLAYBOOK_OF_PRINCIPLES
    assert isinstance(sections, tuple)
    assert len(sections) == 8

    keys = {section.key for section in sections}
    assert len(keys) == len(sections)

    for section in sections:
        assert isinstance(section, PrincipleSection)
        assert section.title
        assert section.summary
        assert section.tenets
        assert len(section.tenets) == 4
        assert all(isinstance(tenet, str) and tenet for tenet in section.tenets)
        assert section.to_dict()["key"] == section.key


def test_dqa_exports_cover_all_tenets():
    principles = build_dqa_principles()
    assert len(principles) == len(PLAYBOOK_OF_PRINCIPLES)
    first = principles[0]
    assert first.identifier == PLAYBOOK_OF_PRINCIPLES[0].key
    assert tuple(first.guardrails) == PLAYBOOK_OF_PRINCIPLES[0].tenets

    rules = build_dqa_rules()
    assert len(rules) == len(PLAYBOOK_OF_PRINCIPLES) * 4
    identifiers = {rule.identifier for rule in rules}
    assert len(identifiers) == len(rules)

    tags_by_section = {section.key: set(section.tags or (section.key.lower(),)) for section in PLAYBOOK_OF_PRINCIPLES}
    for rule in rules:
        section_key = rule.identifier.split(".")[0]
        assert set(rule.tags) == {tag.lower() for tag in tags_by_section[section_key]}


def test_success_formula_representation():
    equation = SUCCESS_FORMULA.equation()
    for component in SUCCESS_FORMULA.components:
        assert component in equation
    assert SUCCESS_FORMULA.result in equation
    assert SUCCESS_FORMULA.context in SUCCESS_FORMULA.to_dict()["context"]
    assert SUCCESS_FORMULA.to_dict()["equation"] == equation
