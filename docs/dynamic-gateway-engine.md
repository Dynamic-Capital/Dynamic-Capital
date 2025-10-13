# Dynamic Gateway Engine Credential Management

The gateway engine now enforces environment-backed credentials when routing
requests through protected edges. Tokens must be sourced from environment
variables to avoid accidental leakage in configuration files or code.

## Registering Credentials

1. Define a strong token in your secrets manager and expose it to the runtime as
   an environment variable (for example `DYNAMIC_EDGE_US_TOKEN`).
2. Register the endpoint and associate the credential with the engine:

   ```python
   from dynamic_gateway_engine import DynamicGatewayEngine, GatewayEndpoint

   engine = DynamicGatewayEngine()
   engine.register_endpoint(
       GatewayEndpoint(
           identifier="edge-us",
           url="https://edge-us.dynamic.gateway",
           region="us-east",
       )
   )
   engine.register_endpoint_credential("edge-us", "DYNAMIC_EDGE_US_TOKEN")
   ```

3. Provide the token through the environment before composing requests. The
   engine resolves headers on demand:

   ```python
   headers = engine.authorisation_headers("edge-us")
   ```

## Validation Rules

- Environment variable names must be uppercase alphanumeric strings and may
  include underscores.
- Attempting to register a missing or malformed credential raises a
  `ValueError`.
- Requests for headers fail fast when the environment variable is absent,
  preventing silent execution with empty secrets.

## Recommended Next Steps

- Store gateway tokens in your preferred secrets manager and inject them at
  deployment time.
- Review any bootstrap scripts or infrastructure templates to ensure they set
  the required environment variables before the gateway engine starts.
