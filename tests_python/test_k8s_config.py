from __future__ import annotations

from copy import deepcopy
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")

from dynamic.kubernetes import K8sConfig


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _minimal_manifest() -> dict[str, object]:
    return {
        "apiVersion": "v1",
        "kind": "Pod",
        "metadata": {"name": "example"},
        "spec": {
            "containers": [
                {
                    "name": "app",
                    "image": "example:latest",
                    "env": [{"name": "FOO", "value": "bar"}],
                    "volumeMounts": [
                        {"name": "data", "mountPath": "/data"},
                    ],
                }
            ],
            "volumes": [
                {"name": "data", "emptyDir": {}},
            ],
        },
    }


def test_k8s_config_from_manifest_validates() -> None:
    manifest_path = PROJECT_ROOT / "docs" / "kubernetes" / "dynamic-cluster-control-plane-pod.yaml"
    manifest = yaml.safe_load(manifest_path.read_text())

    config = K8sConfig.from_mapping(manifest)
    config.validate()

    assert config.kind == "Pod"
    assert config.metadata["name"] == "dynamic-cluster-control-plane-pod"
    assert config.hostname == "dynamic-cluster-control-plane"

    container = config.containers[0]
    assert container.name == "dynamic-cluster-control-plane"
    assert {env.name for env in container.env} >= {"KUBECONFIG", "HOSTNAME"}
    assert any(port.host_port == 9090 for port in container.ports)
    assert {
        mount.name for mount in container.volume_mounts
    } == {
        "lib-modules-host-0",
        "tmp-1",
        "tmp-2",
        "94027cafdb44a93e7045438ee9d5f28ecc0aea245871384d894c7381039431ce-pvc",
    }

    roundtrip = config.as_dict()
    assert roundtrip["apiVersion"] == "v1"
    assert roundtrip["spec"]["containers"][0]["name"] == container.name
    assert roundtrip["spec"]["volumes"][0]["name"] == "lib-modules-host-0"


def test_k8s_config_detects_missing_volume_reference() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["volumes"] = []

    config = K8sConfig.from_mapping(manifest)

    with pytest.raises(ValueError, match="undefined volume 'data'"):
        config.validate()


def test_k8s_config_rejects_duplicate_environment_variables() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["containers"][0]["env"].append({"name": "FOO", "value": "baz"})

    config = K8sConfig.from_mapping(manifest)

    with pytest.raises(ValueError, match="Duplicate environment variable 'FOO'"):
        config.validate()


def test_k8s_config_env_requires_single_value_source() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["containers"][0]["env"].append(
        {
            "name": "DUAL",
            "value": "one",
            "valueFrom": {"fieldRef": {"fieldPath": "metadata.name"}},
        }
    )

    with pytest.raises(ValueError, match="exactly one of 'value' or 'valueFrom'"):
        K8sConfig.from_mapping(manifest)


def test_k8s_config_requires_single_volume_source() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["volumes"][0]["hostPath"] = {"path": "/srv"}

    with pytest.raises(ValueError, match="must define exactly one volume source"):
        K8sConfig.from_mapping(manifest)


def test_k8s_config_roundtrip_preserves_volume_details() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["volumes"][0] = {
        "name": "data",
        "persistentVolumeClaim": {"claimName": "data-pvc"},
    }
    manifest["spec"]["containers"][0]["volumeMounts"][0]["readOnly"] = True

    config = K8sConfig.from_mapping(deepcopy(manifest))
    config.validate()

    roundtrip = config.as_dict()
    assert roundtrip["spec"]["volumes"][0] == manifest["spec"]["volumes"][0]
    assert roundtrip["spec"]["containers"][0]["volumeMounts"][0]["readOnly"] is True


def test_k8s_config_supports_env_value_from() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["containers"][0]["env"].append(
        {
            "name": "POD_NAME",
            "valueFrom": {"fieldRef": {"fieldPath": "metadata.name"}},
        }
    )

    config = K8sConfig.from_mapping(manifest)
    config.validate()

    env_pairs = config.as_dict()["spec"]["containers"][0]["env"]
    assert any(entry.get("valueFrom") == {"fieldRef": {"fieldPath": "metadata.name"}} for entry in env_pairs)


def test_k8s_config_allows_configmap_volume_without_payload() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["volumes"][0] = {"name": "config", "configMap": None}
    manifest["spec"]["containers"][0]["volumeMounts"][0]["name"] = "config"

    config = K8sConfig.from_mapping(manifest)
    config.validate()

    roundtrip = config.as_dict()
    assert roundtrip["spec"]["volumes"][0] == {"name": "config", "configMap": {}}


def test_k8s_config_preserves_volume_options() -> None:
    manifest = _minimal_manifest()
    manifest["spec"]["volumes"][0] = {
        "name": "data",
        "persistentVolumeClaim": {"claimName": "data-pvc"},
        "readOnly": True,
    }
    manifest["spec"]["containers"][0]["volumeMounts"][0]["readOnly"] = True

    config = K8sConfig.from_mapping(deepcopy(manifest))
    config.validate()

    roundtrip = config.as_dict()
    assert roundtrip["spec"]["volumes"][0]["readOnly"] is True
