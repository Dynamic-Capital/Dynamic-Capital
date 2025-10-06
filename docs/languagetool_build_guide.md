# Building LanguageTool from Source

LanguageTool is a multi-module Maven project that bundles grammar-checking capabilities across numerous languages. Building it in-house allows Dynamic Capital to tailor rule sets, deploy the HTTP server on-premises, and audit third-party dependencies.

## Quick Reference

| Requirement                | Recommendation / Command                                                                 |
|---------------------------|--------------------------------------------------------------------------------------------|
| Java                      | Install OpenJDK **17** LTS. Verify with `java -version`.                                   |
| Maven                     | Use the latest Apache Maven. Verify with `mvn -version`.                                   |
| Memory                    | Allocate **≥2 GB** heap to Maven (see `MAVEN_OPTS`).                                       |
| Network                   | Ensure outbound HTTPS access for dependency downloads (Maven Central, LanguageTool CDN).  |
| Disk                      | Reserve **>3 GB** for cloned sources, build artifacts, and language models.                |

> **Prudence Check:** Builds can fail on machines with <2 GB free RAM. Increase heap before attempting a rebuild to avoid repeated failures.

## Pre-Build Checklist

- ✅ **Validate toolchain** – Confirm Java 17 and a recent Maven release are on `PATH` (`java -version`, `mvn -version`).
- ✅ **Calibrate memory** – Export `MAVEN_OPTS` with at least 2 GB heap; bump to 4 GB for CI runners shared with other JVM workloads.
- ✅ **Check disk headroom** – Ensure >3 GB free on the target volume for cloned sources, the local Maven repository, and build artifacts.
- ✅ **Network posture** – Verify outbound HTTPS connectivity to Maven Central and LanguageTool mirrors; register proxy credentials in `~/.m2/settings.xml` when required.
- ✅ **Access control** – Restrict repository access to authorized engineers and keep build hosts patched before compiling third-party code.

## Environment Validation

```bash
java -version
mvn -version
```

If either command reports an older version, install the correct toolchain and update `JAVA_HOME` / `PATH` before proceeding. Persist these updates in shell profiles for reproducible builds across sessions.

## Build Workflow

1. **Clone the Repository**
   ```bash
   git clone https://github.com/languagetool-org/languagetool.git
   cd languagetool
   ```

2. **Set Maven Memory Headroom**
   ```bash
   export MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=512m"
   ```
   Adjust the heap parameter (`-Xmx`) upward on CI hosts with abundant RAM. For ephemeral runners, cache dependencies (`~/.m2/repository`) between jobs to reduce repeat downloads.

3. **Prime Maven Cache (optional but recommended)**
   ```bash
   mvn dependency:go-offline
   ```
   Run once per build host (or cache key) to prefetch dependencies. This reduces risk of partial downloads during the full build, especially on air-gapped networks with mirrored artifact repositories.

4. **Compile Modules**

   | Objective                      | Command                                      | Notes |
   |--------------------------------|----------------------------------------------|-------|
   | Full verification build        | `mvn clean install`                          | Runs unit/integration tests; plan for >30 min on first build. |
   | Fast binary build (skip tests) | `mvn clean install -DskipTests`              | Use for iterative development; rerun full build before release. |
   | Server-only build with deps    | `mvn clean install -pl languagetool-server -am` | Compiles the HTTP server and required shared modules. |

### Module Overview

- `languagetool-core`: Core grammar engine and shared resources.
- `languagetool-server`: HTTP API service (fat JAR output).
- `languagetool-standalone`: Desktop UI plus server distribution with bundled language data.

## Artifact Verification

After the build completes, confirm the expected artifacts exist before planning deployments:

| Module                    | Artifact Path                                                                 | Validation Step |
|---------------------------|-------------------------------------------------------------------------------|-----------------|
| `languagetool-server`     | `languagetool-server/target/languagetool-server.jar`                          | `jar tf` to ensure dependencies bundled |
| `languagetool-standalone` | `languagetool-standalone/target/LanguageTool-<version>-SNAPSHOT/` directory | Inspect `languagetool-server.jar` and `languagetool-commandline.jar` |
| `languagetool-core`       | `languagetool-core/target/languagetool-core-<version>.jar`                    | Confirm checksum if required by governance |

When governance policies require, archive SHA-256 hashes alongside release notes:

```bash
sha256sum languagetool-server/target/languagetool-server.jar > checksums.txt
```

## Running the Server

After a successful build, choose a deployment path:

1. **Standalone Distribution (full language data)**
   ```bash
   java -jar languagetool-standalone/target/LanguageTool-*-SNAPSHOT/languagetool-server.jar --port 8081
   ```
   Convenience scripts are generated alongside the JAR:
   ```bash
   languagetool-standalone/target/LanguageTool-*-SNAPSHOT/languagetool-server
   ```

2. **Server Module Fat JAR (lean footprint)**
   ```bash
   java -jar languagetool-server/target/languagetool-server.jar --port 8081
   ```
   Supply `--languageModel` flags if you maintain external n-gram datasets.

### Health Check

- Monitor startup logs for `Server started on port 8081` (or your configured port) before routing production traffic.
- From another terminal, confirm the port is listening:
  ```bash
  lsof -i :8081
  ```
- Optional: query the `/v2/languages` endpoint to ensure language data loaded successfully.

## Smoke Test the HTTP API

```bash
curl -X POST http://localhost:8081/v2/check \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "text=This is an example text with some errorrs." \
  -d "language=en-US"
```

Successful responses include a JSON body with `matches` describing detected issues. Empty `matches` imply no rule violations were found.

## Troubleshooting & Risk Controls

| Symptom                                  | Likely Cause / Mitigation                                                                 |
|------------------------------------------|--------------------------------------------------------------------------------------------|
| `java.lang.OutOfMemoryError` during build| Increase `MAVEN_OPTS` heap, close other JVM processes, or build on a machine with ≥4 GB RAM. |
| Dependency download failures             | Confirm proxy settings in `~/.m2/settings.xml`, mirror Maven Central if governance requires, or retry with a stable network connection. |
| Server fails to bind port                | Port already in use—either stop the conflicting service or start LanguageTool with `--port <new>`. |
| Slow startup with many languages         | Use `--languageModel` to point to faster local storage, trim unused languages via `--language` flags, or preload JVM caches during deployment. |

## Continuous Integration Guardrails

- **Pinned toolchains:** Set up CI jobs with container images or tool caches that pin Java 17 and Maven to avoid drift between developer workstations and automated pipelines.
- **Memory headroom checks:** Enforce a pre-flight script that aborts builds if available memory drops below 2 GB to prevent noisy failures.
- **Dependency mirrors:** For restricted networks, configure Maven `settings.xml` with an internal repository manager (Nexus/Artifactory) and audit snapshot usage during pull requests.
- **Automated smoke tests:** Add a post-build step that launches the server JAR in ephemeral mode and exercises `/v2/health` or `/v2/check` before marking the pipeline green.

## Configuration & Customization Notes

- **Custom rule packs:** Store XML rule additions under `languagetool-core/src/main/resources/org/languagetool/rules/` and extend the Maven build with regression tests (`mvn -pl languagetool-standalone test -Dtest=YourRuleTest`).
- **Dictionary updates:** Maintain organization-specific wordlists in `languagetool-language-modules/*/src/main/resources/org/languagetool/resource/` and review them quarterly for compliance.
- **Language model storage:** Host large n-gram datasets on local NAS or object storage, reference them with `--languageModel /mnt/ngrams/<language>` in production launches, and document retention schedules.
- **Security hardening:** Run the server behind TLS termination (reverse proxy or ingress), disable public `/admin` endpoints if unused, and rotate API tokens where applicable.

## Operational Runbook Additions

- **Config versioning:** Commit configuration files (rules, custom dictionaries) alongside infrastructure-as-code to align releases across environments.
- **Service restarts:** Wrap the server in a process supervisor (`systemd`, `supervisord`, or container orchestrator) with backoff to avoid crash loops during rule experimentation.
- **Observability hooks:** Export JVM metrics (e.g., via JMX) and integrate HTTP request logging into the existing SIEM for auditability.

## Recommended Next Steps

- **Integrate Rule Governance:** Version-control any custom XML rules under `languagetool-core/src/main/resources/org/languagetool/rules/` and add regression tests before rollout.
- **Harden Deployments:** Wrap the server in a systemd service or container, and configure TLS via a reverse proxy before exposing the API.
- **Monitor Performance:** Capture JVM metrics (heap, GC pauses) during load tests to size production infrastructure appropriately.
- **Plan for Updates:** Track upstream LanguageTool releases and re-run the full verification build before upgrading production environments.
