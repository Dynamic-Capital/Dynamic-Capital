import pytest

from dynamic_playbook import (
    DynamicPlaybookAgent,
    DynamicPlaybookBot,
    DynamicPlaybookEngine,
    DynamicPlaybookHelper,
    DynamicPlaybookKeeper,
    PlaybookBlueprint,
    PlaybookContext,
    PlaybookDisciplineInsight,
    PlaybookEntry,
    PlaybookSynchronizer,
)


def test_playbook_entry_normalisation() -> None:
    entry = PlaybookEntry(
        title="  Launch Intake  ",
        objective="  Capture mission critical requirements  ",
        stage="  Discovery  ",
        readiness=-0.3,
        automation=1.4,
        risk=1.2,
        weight=-5,
        tags=("  Kickoff  ", "kickoff", "New"),
        dependencies=("  Risk review  ", ""),
        owners=("  Ops Lead  ", "Ops Lead"),
        notes="  Document in Notion  ",
    )

    assert entry.title == "Launch Intake"
    assert entry.objective == "Capture mission critical requirements"
    assert entry.stage == "discovery"
    assert entry.readiness == 0.0
    assert entry.automation == 1.0
    assert entry.risk == 1.0
    assert entry.weight == 0.0
    assert entry.tags == ("kickoff", "new")
    assert entry.dependencies == ("Risk review",)
    assert entry.owners == ("Ops Lead", "Ops Lead")
    assert entry.notes == "Document in Notion"
    assert entry.is_blocked is True
    assert entry.is_high_risk is True


def test_build_blueprint_surfaces_actions() -> None:
    engine = DynamicPlaybookEngine(history=5)
    engine.extend(
        [
            {
                "title": "Automation Wiring",
                "objective": "Connect triggers to CRM",
                "stage": "integration",
                "readiness": 0.35,
                "automation": 0.4,
                "risk": 0.55,
                "tags": ("automation", "crm"),
                "owners": ("Engineering",),
            },
            {
                "title": "Desk Runbook",
                "objective": "Publish support flows",
                "stage": "enablement",
                "readiness": 0.6,
                "automation": 0.45,
                "risk": 0.4,
                "tags": ("support", "playbook"),
                "owners": ("Ops",),
            },
            {
                "title": "Risk Controls",
                "objective": "Map stop loss enforcement",
                "stage": "integration",
                "readiness": 0.42,
                "automation": 0.55,
                "risk": 0.72,
                "tags": ("risk", "controls"),
                "owners": ("Risk",),
            },
        ]
    )

    context = PlaybookContext(
        mission="Launch TON desk",
        cadence="Weekly",
        risk_tolerance=0.45,
        automation_expectation=0.6,
        readiness_pressure=0.55,
        oversight_level=0.7,
        escalation_channels=("Telegram", "War room"),
        scenario_focus=("automation", "risk"),
        highlight_limit=3,
    )

    blueprint = engine.build_blueprint(context, limit=3)

    assert isinstance(blueprint, PlaybookBlueprint)
    assert blueprint.total_entries == 3
    assert "Launch TON desk" in blueprint.mission_summary
    assert len(blueprint.focus_streams) <= context.highlight_limit
    assert any(topic in {"integration", "enablement", "automation", "risk"} for topic in blueprint.focus_streams)
    assert blueprint.readiness_alignment < context.readiness_pressure
    assert any("automation" in action.lower() for action in blueprint.enablement_actions)
    assert any("oversight" in step.lower() or "route urgent" in step.lower() for step in blueprint.escalation_plan)
    assert blueprint.risk_outlook in {"Elevated risk", "Critical risk"}
    assert "Readiness" in blueprint.narrative


def test_build_blueprint_requires_entries_and_limit_positive() -> None:
    engine = DynamicPlaybookEngine()
    context = PlaybookContext(
        mission="Default",
        cadence="Bi-weekly",
        risk_tolerance=0.5,
        automation_expectation=0.5,
        readiness_pressure=0.5,
        oversight_level=0.3,
    )

    with pytest.raises(RuntimeError):
        engine.build_blueprint(context)

    engine.capture(
        PlaybookEntry(
            title="Baseline",
            objective="Initial setup",
            stage="planning",
        )
    )

    with pytest.raises(ValueError):
        engine.build_blueprint(context, limit=0)


def test_playbook_synchronizer_automates_updates_and_sync() -> None:
    synchronizer = PlaybookSynchronizer()
    context = PlaybookContext(
        mission="Scale automation",
        cadence="Weekly",
        risk_tolerance=0.4,
        automation_expectation=0.6,
        readiness_pressure=0.5,
        oversight_level=0.55,
        scenario_focus=("automation", "training"),
        highlight_limit=2,
    )

    synchronizer.implement(
        {
            "title": "Alpha Rollout",
            "objective": "Deploy onboarding script",
            "stage": "enablement",
            "readiness": 0.45,
            "automation": 0.55,
            "risk": 0.4,
            "tags": ("onboarding",),
            "owners": ("Ops",),
        }
    )
    synchronizer.implement(
        PlaybookEntry(
            title="Automation Control Room",
            objective="Wire telemetry triggers",
            stage="integration",
            readiness=0.35,
            automation=0.65,
            risk=0.58,
            tags=("automation", "telemetry"),
            owners=("Engineering",),
        )
    )

    catalogue = synchronizer.catalogue()
    assert [entry.title for entry in catalogue] == [
        "Alpha Rollout",
        "Automation Control Room",
    ]

    initial_blueprint = synchronizer.sync_blueprint(context)
    assert initial_blueprint.total_entries == 2
    assert "Scale automation" in initial_blueprint.mission_summary
    assert any(stream in {"enablement", "integration", "automation"} for stream in initial_blueprint.focus_streams)

    synchronizer.update(
        "Alpha Rollout",
        readiness=0.8,
        automation=0.7,
        tags=("onboarding", "training"),
        notes="Run desk drill",
    )

    synchronizer.remove("Automation Control Room")

    payload = synchronizer.sync_payload(context)
    assert payload["blueprint"]["total_entries"] == 1
    assert payload["entries"][0]["title"] == "Alpha Rollout"
    assert "Run desk drill" in payload["entries"][0]["notes"]

    with pytest.raises(KeyError):
        synchronizer.update("Missing", readiness=0.3)

    synchronizer.implement(
        {
            "title": "Automation Control Room",
            "objective": "Wire telemetry triggers",
            "stage": "integration",
            "readiness": 0.4,
            "automation": 0.8,
            "risk": 0.55,
            "tags": ("automation",),
            "owners": ("Engineering",),
        }
    )

    refreshed = synchronizer.sync_blueprint(context)
    assert refreshed.total_entries == 2
    assert refreshed.readiness_alignment > initial_blueprint.readiness_alignment


def test_playbook_synchronizer_allows_title_rename() -> None:
    synchronizer = PlaybookSynchronizer()
    synchronizer.implement(
        {
            "title": "Signal Station",
            "objective": "Coordinate response streams",
            "stage": "integration",
        }
    )

    renamed = synchronizer.update("Signal Station", title="Signal Tower")
    assert renamed.title == "Signal Tower"
    assert synchronizer.catalogue()[0].title == "Signal Tower"

    with pytest.raises(KeyError):
        synchronizer.update("Signal Station", readiness=0.6)

    updated = synchronizer.update("Signal Tower", readiness=0.6)
    assert updated.readiness == 0.6

    removed = synchronizer.remove("Signal Tower")
    assert removed.title == "Signal Tower"

    with pytest.raises(KeyError):
        synchronizer.remove("Signal Station")


def test_playbook_synchronizer_caches_ordering_until_dirty() -> None:
    synchronizer = PlaybookSynchronizer()
    synchronizer.implement(
        {
            "title": "Initial Play",
            "objective": "Prime system",
            "stage": "launch",
        }
    )

    first = synchronizer.catalogue()
    second = synchronizer.catalogue()
    assert first is second

    serialised_first = synchronizer._serialised_entries()
    serialised_second = synchronizer._serialised_entries()
    assert serialised_first is serialised_second

    synchronizer.update("Initial Play", readiness=0.75)
    refreshed = synchronizer.catalogue()
    assert refreshed is not second

    serialised_third = synchronizer._serialised_entries()
    assert serialised_third is not serialised_first

    unchanged = synchronizer.update("Initial Play")
    assert unchanged is refreshed[0]
    after_noop = synchronizer.catalogue()
    assert after_noop is refreshed
    assert synchronizer._serialised_entries() is serialised_third

    synchronizer.remove("Initial Play")
    assert synchronizer.catalogue() == ()
    assert synchronizer._serialised_entries() == ()


def test_playbook_discipline_stack_cooperates() -> None:
    agent = DynamicPlaybookAgent()
    context = PlaybookContext(
        mission="Stabilise escalation routines",
        cadence="Daily",
        risk_tolerance=0.5,
        automation_expectation=0.55,
        readiness_pressure=0.6,
        oversight_level=0.65,
        escalation_channels=("PagerDuty",),
        scenario_focus=("integration", "stability"),
        highlight_limit=2,
    )

    agent.implement(
        {
            "title": "Escalation Runbook",
            "objective": "Document severity protocols",
            "stage": "enablement",
            "readiness": 0.5,
            "automation": 0.4,
            "risk": 0.55,
            "tags": ("playbook", "documentation"),
            "owners": ("Ops",),
        }
    )
    agent.implement(
        {
            "title": "Incident Telemetry",
            "objective": "Wire automated alerting",
            "stage": "integration",
            "readiness": 0.42,
            "automation": 0.65,
            "risk": 0.62,
            "tags": ("automation", "integration"),
            "owners": ("Engineering",),
        }
    )

    disciplined = agent.discipline(context)
    assert isinstance(disciplined, PlaybookDisciplineInsight)
    assert disciplined.blueprint.total_entries == len(disciplined.entries) == 2
    assert disciplined.raw.metrics["enablement_actions"] >= 1
    assert any("Focus streams" in highlight for highlight in disciplined.raw.highlights)

    keeper = DynamicPlaybookKeeper(limit=5)
    stored = keeper.discipline(agent, context=context)
    assert keeper.latest == stored.raw
    assert keeper.average_readiness() == pytest.approx(
        stored.raw.metrics["readiness_alignment"]
    )

    helper = DynamicPlaybookHelper()
    digest = helper.compose_digest(stored.raw)
    assert "Blueprint Summary" in digest
    assert "Enablement" in digest

    bot = DynamicPlaybookBot(agent=agent, helper=helper, keeper=keeper)
    report = bot.discipline(context=context)
    assert report.count("Blueprint Summary") >= 1
