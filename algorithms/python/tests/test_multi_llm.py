import pytest

from algorithms.python.multi_llm import AdaptiveParameterScheduler, LLMConfig


class StubClient:
    def __init__(self, responses: list[str]) -> None:
        self.responses = responses
        self.calls: list[dict[str, float | str]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self.responses:
            raise RuntimeError("No responses queued")
        return self.responses.pop(0)


class RecordingScheduler:
    def __init__(self, response: dict[str, float | int]) -> None:
        self.response = response
        self.calls: list[tuple[str, dict[str, object]]] = []

    def __call__(self, run, feedback):  # type: ignore[no-untyped-def]
        self.calls.append((run.name, dict(feedback)))
        return dict(self.response)


def test_llm_config_scheduler_updates_parameters() -> None:
    scheduler = RecordingScheduler({"temperature": 0.3, "max_tokens": 200})
    client = StubClient(["{""result"": ""ok""}"])
    config = LLMConfig(
        name="stub",
        client=client,
        temperature=0.5,
        nucleus_p=0.92,
        max_tokens=128,
        parameter_scheduler=scheduler,
    )

    run = config.run("Prompt", feedback={"custom": True})

    assert config.temperature == pytest.approx(0.3, rel=1e-6)
    assert config.max_tokens == 200
    assert scheduler.calls[0][1]["custom"] is True

    config.apply_feedback(run, {"parse_success": False})
    assert len(scheduler.calls) == 2
    assert scheduler.calls[1][1]["parse_success"] is False


def test_adaptive_scheduler_adjusts_on_parse_failure() -> None:
    client = StubClient(["{""value"": 1}"])
    scheduler = AdaptiveParameterScheduler(
        min_temperature=0.1,
        max_temperature=1.3,
        temperature_step=0.1,
        min_nucleus_p=0.2,
        max_tokens_step=64,
        max_tokens_floor=128,
    )
    config = LLMConfig(
        name="adaptive",
        client=client,
        temperature=0.6,
        nucleus_p=0.9,
        max_tokens=256,
        parameter_scheduler=scheduler,
    )

    run = config.run("Some prompt")
    config.apply_feedback(run, {"parse_success": False, "response_length": 255, "truncated": True})

    assert config.temperature == pytest.approx(0.5, rel=1e-6)
    assert config.nucleus_p == pytest.approx(0.85, rel=1e-6)
    assert config.max_tokens == 320
