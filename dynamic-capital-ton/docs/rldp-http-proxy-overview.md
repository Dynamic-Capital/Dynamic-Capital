# RLDP HTTP Proxy Overview

## Purpose

The upstream TON `rldp-http-proxy` binary bridges TON's RLDP transport with
plain HTTP so that `.ton`, `.adnl`, and storage-backed domains can be served or
consumed by traditional web tooling. It provides two complementary roles:

- **HTTP → RLDP gateway** – listens on a local TCP port and rewrites outbound
  HTTP proxy requests into RLDP queries that resolve TON domains and fetch the
  target content via the ADNL/RLDP stack.
- **RLDP → HTTP reverse proxy** – binds to an ADNL endpoint, accepts inbound
  RLDP HTTP requests for specific TON hostnames, and forwards them to a local or
  remote HTTP origin.

## Build & Packaging Notes

The tool is built as a standalone C++ executable with CMake:

- Target name: `rldp-http-proxy` (`rldp-http-proxy/CMakeLists.txt`).
- Sources: `rldp-http-proxy.cpp`, `DNSResolver.h`, `DNSResolver.cpp`.
- Linked libraries: `tonhttp`, `rldp`, `rldp2`, `dht`, `tonlib`, and `git` so
  the binary can speak HTTP, RLDP v1/v2, interact with TON DHT, and expose
  build metadata.
- Install rule drops the executable into `bin/`.

When embedding this component we should expect to reuse the existing TON
third-party toolchain (CMake, TDLib/TON libraries) that the rest of the
`ton` repository already consumes.

## Runtime Architecture

### Dispatcher layer

`RldpDispatcher` implements `ton::adnl::AdnlSenderInterface` and multiplexes
between RLDP v1 and RLDP2 back-ends. It tracks which remote peers advertise
RLDP2 support and forwards traffic to the appropriate actor, providing a
transparent upgrade path while maintaining compatibility with older nodes.

### HTTP client bridge

`HttpRemote` is an actor wrapping `ton::http::HttpClient::create_multi(...)`.
For reverse-proxy scenarios it accepts serialized HTTP requests from the RLDP
side, forwards them to the configured origin, and propagates responses back to
RLDP consumers. It mirrors keep-alive behaviour, injects chunked transfer
encoding headers when needed, and reports readiness via a lightweight callback.

### RLDP payload streaming

Two complementary actors convert between RLDP payload streams and incremental
HTTP bodies:

- `HttpRldpPayloadReceiver` pulls response chunks from RLDP using
  `http_getNextPayloadPart` queries. It enforces a ~2 MiB watermark, copies data
  into the HTTP payload buffer, propagates trailers, and terminates once the
  remote sets the `last_` flag.
- `HttpRldpPayloadSender` registers a payload producer for RLDP queries,
  subscribes to HTTP payload callbacks, and answers RLDP `http_request` queries
  with streaming body chunks until completion or cancellation.

### TON-aware DNS resolution

`DNSResolver` keeps a short-lived cache (soft TTL = 270 s, hard TTL = 300 s) and
uses `tonlib_api::dns_resolve` to resolve `.ton` hostnames and TON Storage bag
identifiers. It canonicalises ADNL addresses into the `*.adnl` format, stores
results locally, and refreshes them opportunistically when entries approach the
soft timeout.

## Command-line Interface

The proxy exposes a rich `OptionParser` surface so it can be deployed in both
client and server modes. Notable flags include:

| Flag | Name | Description |
| ---- | ---- | ----------- |
| `-p` | `--port` | Local HTTP listening port for HTTP→RLDP proxy traffic. |
| `-a` | `--address` | `<ip>:<port>` pair describing the UDP socket for RLDP queries. |
| `-A` | `--adnl` | Registers remote ADNL node IDs that accept proxied requests. |
| `-c` | `--client-port` | UDP port dedicated to outbound client ADNL queries. |
| `-C` | `--global-config` | Path to the TON global configuration JSON. |
| `-L` | `--local` | Maps a TON hostname and optional port list to a local HTTP origin (`127.0.0.1` by default). |
| `-R` | `--remote` | Maps a TON hostname to an arbitrary remote origin in `<host>:<ports>@<ip>:<port>` form. |
| `-D` | `--db` | Sets the persistent database root for TON state. |
| `-S` | `--storage-gateway` | ADNL address of a TON Storage gateway to service bag requests. |
| `-P` | `--proxy-all` | Toggles whether the HTTP proxy forwards all hostnames or only `.ton`/`.adnl` names. |
| `-l` | `--logname` | Enables file-based logging via `td::FileLog`. |
| `-d` | `--daemonize` | Installs a SIGHUP handler and detaches on Unix. |
| `-V` | `--version` | Prints git commit metadata baked into the binary. |
| `-v` | `--verbosity` | Adjusts the logging verbosity. |

Multiple `-L` or `-R` flags can be combined, and port lists accept comma-delimited
values (defaulting to `80,443`). Host resolution happens up front, so mis-typed
port numbers surface as validation errors during startup.

## Operational Considerations

- The scheduler runs inside TDLib's actor runtime and creates the proxy actor
  before parsing command-line options, ensuring options can mutate the actor's
  state safely.
- RLDP payloads are capped at approximately 2 MiB chunks; deployments serving
  large assets should confirm TON Storage gateway support or rely on HTTP range
  semantics.
- Storage gateway support is optional but recommended for `.bag` URLs so static
  assets can be fetched directly from TON Storage without falling back to ADNL
  peers.
- Because DNS answers are cached locally, long-running services should plan to
  restart or add explicit cache invalidation when migrating TON DNS entries.

## Next Steps for Dynamic Capital

- Integrate the upstream build into our toolchain (Docker image or CI job) so we
  can provision RLDP-aware HTTP endpoints alongside Dynamic Capital services.
- Wire configuration management around the documented CLI flags to declaratively
  describe which TON domains map to which origins in staging/production.
- Extend monitoring to capture proxy health (ready state from `HttpRemote`, RLDP
  timeout metrics, DNS cache hit rate) once the binary is packaged for our stack.
