# Building LanguageTool from Source

## Overview

LanguageTool is a multi-module Maven project that bundles grammar-checking capabilities across numerous languages. Building from source gives you control over the server, desktop application, and language resources.

## Prerequisites

- **Java 17** (or newer within the Java 17 LTS line)
- **Apache Maven** (latest release recommended)
- Internet access for downloading Maven dependencies
- At least **2 GB** of available memory for the build process

Verify your environment:

```bash
java -version
mvn -version
```

## Step-by-Step Build Process

1. **Clone the Repository**
   ```bash
   git clone https://github.com/languagetool-org/languagetool.git
   cd languagetool
   ```

2. **Configure Maven Memory (optional but recommended)**
   ```bash
   export MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=512m"
   ```

3. **Build the Project**
   - Full build (runs tests):
     ```bash
     mvn clean install
     ```
   - Faster build (skips tests):
     ```bash
     mvn clean install -DskipTests
     ```

### Module-Specific Builds

LanguageTool’s Maven modules include:

- `languagetool-core`: Core grammar engine
- `languagetool-server`: Standalone HTTP server
- `languagetool-standalone`: Desktop app plus bundled server distribution

To build only the server (and required dependencies) from the project root:

```bash
mvn clean install -pl languagetool-server -am
```

## Running the Server

After building, start the server using one of the following approaches:

- **Standalone distribution (recommended for full language data):**
  ```bash
  java -jar languagetool-standalone/target/LanguageTool-*-SNAPSHOT/languagetool-server.jar --port 8081
  ```
  The standalone target directory also contains convenience scripts:
  ```bash
  languagetool-standalone/target/LanguageTool-*-SNAPSHOT/languagetool-server
  ```

- **Server module fat jar:**
  ```bash
  java -jar languagetool-server/target/languagetool-server.jar --port 8081
  ```

## Testing the HTTP API

```bash
curl -X POST http://localhost:8081/v2/check \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "text=This is an example text with some errorrs." \
  -d "language=en-US"
```

## Recommended Next Steps

- Customize grammar rules in `languagetool-core/src/main/resources/org/languagetool/rules/`.
- Add custom dictionaries or language modules as needed.
- Consider Docker (e.g., `erikvl87/languagetool`) if you prefer containerized deployments over manual builds.

