# Open Source AI Defense Stack

## Purpose

This guide maps the leading open-source security projects to the AI model
lifecycle so teams can assemble a layered defense without proprietary tooling.
Use it to choose the right guardrails for model development, deployment, and
ongoing governance.

## Tool Categories

### 1. Adversarial Robustness & Testing

- **[Adversarial Robustness Toolbox (ART)](https://github.com/Trusted-AI/adversarial-robustness-toolbox)**
  – Linux Foundation project covering evasion, extraction, and poisoning attack
  simulations alongside defenses such as adversarial training, preprocessing,
  and detection. Supports TensorFlow, PyTorch, scikit-learn, and classical ML
  pipelines.
- **[TextAttack](https://github.com/QData/TextAttack)** – NLP-focused
  adversarial generation and augmentation framework with recipes for
  classification, entailment, and sequence tasks plus training utilities.
- **[TrojanNetDetector](https://github.com/PurduePAML/TrojanNetDetector)** –
  Detection suite for backdoor triggers that evaluates model activations to spot
  Trojan behavior before deployment.
- **[Foolbox](https://github.com/bethgelab/foolbox)** – Toolbox for generating
  adversarial examples across differentiable and score-based attacks with
  interfaces for PyTorch, TensorFlow, and JAX plus benchmarking utilities.
- **[RobustBench](https://github.com/RobustBench/robustbench)** – Leaderboard
  and evaluation harness that tracks state-of-the-art adversarial defenses and
  allows you to validate robustness claims on standardized datasets.

### 2. Privacy & Confidentiality

- **[TensorFlow Privacy](https://github.com/tensorflow/privacy)** – Differential
  privacy optimizers and accounting tools that add calibrated noise during
  training to protect individual records.
- **[PySyft](https://github.com/OpenMined/PySyft)** – Federated learning, secure
  aggregation, and privacy-preserving analytics framework that keeps raw data on
  the owner’s infrastructure.
- **[Opacus](https://github.com/pytorch/opacus)** – PyTorch-native differential
  privacy engine with per-sample gradient clipping, privacy accounting, and
  ready-made optimizers for DP training pipelines.
- **[Diffprivlib](https://github.com/IBM/differential-privacy-library)** –
  Library of DP mechanisms, estimators, and accounting helpers for scikit-learn
  workflows and statistical analyses.

### 3. Model & Supply Chain Security

- **[Pyrsia](https://pyrsia.io/)** – Decentralized build network and package
  registry that cryptographically verifies dependencies (containers, Python
  packages) to prevent supply-chain tampering in ML stacks.
- **MLCraft / Sigstore for ML** – Apply Sigstore (cosign, fulcio, rekor) signing
  workflows to model artifacts so consumers can verify provenance, integrity,
  and revocation status.
- **[in-toto](https://github.com/in-toto/in-toto)** – Framework for creating and
  verifying cryptographically signed software supply-chain layouts to ensure
  every ML artifact passes through approved build and review steps.
- **[slsa-verifier](https://github.com/slsa-framework/slsa-verifier)** – CLI for
  validating SLSA provenance attestations (including Sigstore bundles) so you
  can enforce integrity policies on models and datasets before promotion.

### 4. Security for Large Language Models (LLMs)

- **[Garak](https://github.com/leondz/garak)** – Automated LLM red-team harness
  that probes for prompt injection, leakage, jailbreaks, toxicity, and safety
  violations.
- **[LLM Guard](https://github.com/protectai/llm-guard)** – Input/output
  security proxy that screens PII, toxic content, prompt-injection attempts, and
  topic restrictions.
- **[Rebuff](https://github.com/protectai/rebuff)** – Prompt-injection detector
  that layers heuristics, LLM-based analysis, and canary tokens while learning
  from new attack patterns.
- **[Guardrails AI](https://github.com/guardrails-ai/guardrails)** – Validation
  framework for constraining LLM outputs with schemas, safety checks, and custom
  validators to enforce policy compliance.
- **[NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails)** –
  Configurable rail system for grounding LLM responses, filtering topics, and
  mediating tool calls with policy-driven flows.

### 5. End-to-End Platforms & Governance

- **MLflow + Security Plugins** – Use MLflow’s registry and lineage tracking
  with scanner plugins to record model provenance, approvals, and vulnerability
  reports.
- **Kubeflow + Policy Controls** – Pair Kubeflow pipelines with
  Kubernetes-native security policies (OPA/Gatekeeper, Pod Security Standards)
  to harden runtime environments.
- **[OpenSSF Scorecard](https://github.com/ossf/scorecard)** – Automated supply
  chain health assessment for the open-source dependencies in your ML platform,
  surfacing risks like pinned dependencies or missing branch protections.

## Layered Deployment Blueprint

### Development

1. Integrate ART and TextAttack into training loops to benchmark adversarial
   robustness and perform adversarial training where needed.
2. Use Foolbox or RobustBench to regression-test robustness metrics against
   standardized attack suites.
3. Add TensorFlow Privacy, PySyft, or Opacus when handling sensitive datasets
   that require differential privacy or federated training.

### Pre-Deployment

1. Audit models and dependencies for known CVEs; verify package integrity
   through Pyrsia or equivalent SBOM-backed registries.
2. Sign model artifacts with Sigstore/cosign, generate in-toto layouts, and
   verify SLSA attestations before promotion; record provenance evidence in
   MLflow (or an equivalent registry).

### Deployment & Runtime (LLM Chatbot Example)

1. Place LLM Guard as a request/response filter between clients and the model
   endpoint.
2. Schedule Garak red-team campaigns against production endpoints to surface new
   jailbreak vectors.
3. Use Rebuff inline with the application to detect prompt injections and adapt
   defenses.

### Governance & Monitoring

1. Track deployed versions, training datasets, and ownership in MLflow for
   auditability.
2. Monitor infrastructure and application logs for anomalies that indicate
   ongoing adversarial activity.
3. Rotate signing keys and regenerate attestations when models are retrained.
4. Run OpenSSF Scorecard (and similar health scanners) on the repos feeding your
   ML platform to catch emerging supply-chain risks.

## Operational Considerations

- **Continuous Process:** Re-run adversarial tests and privacy audits after each
  model update; security debt accumulates quickly in fast iteration cycles.
- **Performance Trade-offs:** Evaluate the impact of differential privacy noise
  or adversarial defenses on model accuracy and latency before shipping changes.
- **Human Factors:** Ensure operators understand alerting pipelines, signing
  procedures, and policy enforcement—tools cannot compensate for
  misconfiguration or skipped reviews.

## Quick Start Checklist

1. Baseline adversarial robustness metrics with ART/TextAttack and regression
   runs in Foolbox/RobustBench.
2. Decide on privacy requirements and enable TensorFlow Privacy, PySyft, or
   Opacus accordingly.
3. Lock down the supply chain via Pyrsia (or comparable verified registries) and
   run OpenSSF Scorecard on upstream dependencies.
4. Sign and publish models with Sigstore workflows plus in-toto/SLSA
   attestations.
5. Deploy LLM Guard, Rebuff, Guardrails AI, NeMo Guardrails, and Garak for
   continuous probing and protection.
6. Document model lineage and approvals in MLflow, and enforce runtime policies
   in Kubeflow/Kubernetes while running Scorecard health checks on upstream
   dependencies.

Use this stack as a modular reference—adopt the layers that match your risk
profile and revisit the plan as threats evolve.
