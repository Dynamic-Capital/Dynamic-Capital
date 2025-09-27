from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from dynamic_skeleton.compliance import (  # noqa: E402
    ComplianceCheck,
    ComplianceReport,
    DynamicComplianceAlgo,
)


@pytest.fixture()
def compliance() -> DynamicComplianceAlgo:
    return DynamicComplianceAlgo()


def test_compliance_register_and_update(compliance: DynamicComplianceAlgo) -> None:
    onboarding = compliance.register_check("kyc-onboard", "KYC Onboarding", "Verify all new wallets")
    sanctions = compliance.register_check("sanctions", "Sanctions Screening", "Screen transfers against OFAC")

    assert isinstance(onboarding, ComplianceCheck)
    assert onboarding.status == "pending"

    compliance.update_check("kyc-onboard", "pass", note="All clear")
    compliance.update_check("sanctions", "warn", note="One manual review pending")

    totals = compliance.status_totals()
    assert totals == {"pending": 0, "pass": 1, "warn": 1, "fail": 0}

    summary = compliance.status_summary()
    assert "pass:1" in summary
    assert "warn:1" in summary

    report = compliance.generate_report()
    assert isinstance(report, ComplianceReport)
    assert report.overall_status == "warn"
    assert len(report.checks) == 2
    assert any("manual review" in note for check in report.checks for note in check.notes)


def test_compliance_overall_statuses(compliance: DynamicComplianceAlgo) -> None:
    compliance.register_check("aml-1", "AML", "Monitor transactions")

    report_pending = compliance.generate_report()
    assert report_pending.overall_status == "pending"

    compliance.update_check("aml-1", "pass")
    report_pass = compliance.generate_report()
    assert report_pass.overall_status == "pass"

    compliance.register_check("aml-2", "AML Escalation", "Investigate alerts")
    compliance.update_check("aml-2", "warn")
    report_warn = compliance.generate_report()
    assert report_warn.overall_status == "warn"

    compliance.update_check("aml-2", "fail", note="Escalated to compliance officer")
    report_fail = compliance.generate_report()
    assert report_fail.overall_status == "fail"
    assert "FAIL" in report_fail.summary

    with pytest.raises(KeyError):
        compliance.update_check("missing", "pass")

    with pytest.raises(ValueError):
        compliance.update_check("aml-1", "invalid")
