# Building LanguageTool from Source

LanguageTool is a multi-module Maven project that powers grammar checking for
more than 30 languages. Building it internally lets Dynamic Capital tailor the
rule set, keep dependencies auditable, and host the HTTP server inside
controlled networks.

## Outcome Goals

- Produce reproducible build artifacts for both the standalone bundle and the
  server module.
- Exercise lightweight smoke tests so the HTTP API can be verified before
  handoff to production environments.
- Capture operational guardrails that reduce build drift between engineers and
  CI.

## Quick Reference

| Requirement | Recommendation / Command                                                        |
| ----------- | ------------------------------------------------------------------------------- |
| Java        | Install OpenJDK **17** LTS and verify with `java -version`.                     |
| Maven       | Install the latest Apache Maven and confirm with `mvn -version`.                |
| Memory      | Allocate **≥2 GB** heap to Maven via `MAVEN_OPTS`; budget 4 GB on shared CI.    |
| Disk        | Keep **>3 GB** free for sources, the local Maven cache, and language resources. |
| Network     | Provide outbound HTTPS access to Maven Central (or an internal mirror).         |

> **Prudence Check:** Builds can fail on hosts with <2 GB free RAM. Increase
> heap and rerun failed jobs only after confirming resources are available.

## Pre-Build Checklist

- ✅ **Toolchain** – Confirm Java 17 and the latest Maven release are on `PATH`
  (`java -version`, `mvn -version`).
- ✅ **Memory** – Export `MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=512m"`; increase
  the heap on constrained CI runners.
- ✅ **Disk** – Ensure >3 GB free on the build volume for git history, Maven
  cache, and assembled artifacts.
- ✅ **Network posture** – Verify outbound HTTPS access or configure
  `~/.m2/settings.xml` for proxies and mirrors.
- ✅ **Access control** – Restrict repository access and patch build hosts
  before compiling third-party code.

## Environment Validation

```bash
java -version
mvn -version
```

If either command reports an older version, install the supported toolchain and
persist the updated `JAVA_HOME` / `PATH` values in shell profiles for repeatable
builds.

## Build Workflow

1. **Clone the repository**
   ```bash
   git clone https://github.com/languagetool-org/languagetool.git
   cd languagetool
   ```
2. **Set Maven memory headroom**
   ```bash
   export MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=512m"
   ```
   Adjust `-Xmx` upward on hosts that also run other JVM workloads. Cache
   `~/.m2/repository` between CI jobs to shrink cold-start times.
3. **Prime the dependency cache (optional)**
   ```bash
   mvn dependency:go-offline
   ```
   Run once per build host (or cache key) to download dependencies ahead of the
   full build.
4. **Compile desired modules**

   | Objective                      | Command                                         | Notes                                   |
   | ------------------------------ | ----------------------------------------------- | --------------------------------------- |
   | Full verification build        | `mvn clean install`                             | Runs unit + integration tests.          |
   | Fast binary build (skip tests) | `mvn clean install -DskipTests`                 | Use for local iteration only.           |
   | Server only with deps          | `mvn clean install -pl languagetool-server -am` | Builds the HTTP server and dependencies |

### Module Overview

- `languagetool-core`: Core grammar engine plus shared resources.
- `languagetool-server`: HTTP API fat JAR for lean deployments.
- `languagetool-standalone`: Desktop app and server bundle with language data.

## Artifact Verification

Confirm artifacts before scheduling deployments:

| Module                    | Artifact Path                                                               | Validation Step                                     |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| `languagetool-server`     | `languagetool-server/target/languagetool-server.jar`                        | `jar tf` to confirm dependencies are bundled.       |
| `languagetool-core`       | `languagetool-core/target/languagetool-core-<version>.jar`                  | Generate SHA-256 when governance requires archival. |
| `languagetool-standalone` | `languagetool-standalone/target/LanguageTool-<version>-SNAPSHOT/` directory | Inspect `languagetool-server.jar` and CLI binaries. |

Archive checksums when policy requires:

```bash
sha256sum languagetool-server/target/languagetool-server.jar >> checksums.txt
```

## Running the Server

### Standalone distribution (full language data)

```bash
java -jar languagetool-standalone/target/LanguageTool-*-SNAPSHOT/languagetool-server.jar --port 8081
```

Convenience scripts are available alongside the jar:

```bash
languagetool-standalone/target/LanguageTool-*-SNAPSHOT/languagetool-server
```

### Server module fat JAR (lean footprint)

```bash
java -jar languagetool-server/target/languagetool-server.jar --port 8081
```

Provide `--languageModel` flags if external n-gram datasets are hosted
separately.

### Health verification

- Watch logs for `Server started on port 8081` (or chosen port).
- Confirm the socket is listening:
  ```bash
  lsof -i :8081
  ```
- Optionally call `/v2/languages` to ensure data loaded correctly.

## Smoke Test the HTTP API

```bash
curl -X POST http://localhost:8081/v2/check \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "text=This is an example text with some errorrs." \
  -d "language=en-US"
```

Successful responses include a JSON payload with `matches`. Empty `matches`
implies no rule violations were detected.

## Troubleshooting & Risk Controls

| Symptom                                   | Likely Cause / Mitigation                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `java.lang.OutOfMemoryError` during build | Increase `MAVEN_OPTS`, terminate other JVM jobs, or move to ≥4 GB RAM hosts. |
| Dependency download failures              | Review proxy credentials, mirror Maven Central, or retry on a stable link.   |
| Server fails to bind port                 | Free the conflicting service or change ports via `--port <new>`.             |
| Slow startup with many languages          | Use faster storage for n-grams, trim unused languages, or warm JVM caches.   |

## Continuous Integration Guardrails

- **Pinned toolchains:** Use container images or cached tool installs that lock
  Java 17 and Maven versions.
- **Resource checks:** Abort builds when available memory drops below 2 GB.
- **Dependency mirrors:** Configure Maven `settings.xml` to point at
  Nexus/Artifactory where required; audit snapshot usage in pull requests.
- **Automated smoke tests:** Launch the server jar in ephemeral mode and probe
  `/v2/health` or `/v2/check` before promoting builds.

## Configuration & Customization Notes

- **Custom rule packs:** Store XML rules in
  `languagetool-core/src/main/resources/org/languagetool/rules/` and cover them
  with regression tests
  (`mvn -pl languagetool-standalone test -Dtest=YourRuleTest`).
- **Dictionary updates:** Maintain org-specific wordlists in
  `languagetool-language-modules/*/src/main/resources/org/languagetool/resource/`
  and review quarterly for compliance.
- **Language model storage:** Host n-gram datasets on NAS or object storage and
  reference via `--languageModel /mnt/ngrams/<language>` in production.
- **Security hardening:** Place the server behind TLS termination, disable
  unused `/admin` endpoints, and rotate API tokens.

## Operational Runbook Additions

- **Config versioning:** Commit rule and dictionary changes alongside
  infrastructure as code.
- **Service restarts:** Use `systemd`, `supervisord`, or orchestrators with
  backoff to avoid crash loops.
- **Observability hooks:** Export JVM metrics (JMX, Prometheus exporters) and
  forward HTTP access logs into the existing SIEM.

## Recommended Next Steps

1. **Integrate rule governance** – Version-control custom XML rules and require
   regression tests in CI before rollout.
2. **Harden deployments** – Wrap the server in a managed service or container
   and terminate TLS at a reverse proxy prior to exposure.
3. **Monitor performance** – Record JVM heap usage and GC pause times during
   load testing to size production infrastructure.
4. **Plan upgrades** – Track upstream LanguageTool releases, rebuild from tag,
   and re-run the verification build before promoting updates.
