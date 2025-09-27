# OneDrive Authorization with rclone

## Prerequisites

- Install [rclone](https://rclone.org/downloads/) on the machine where you will
  run the authorization.
- Ensure you have access to the OneDrive tenant associated with the provided
  configuration JSON.

## Authorize OneDrive

Run the following command to begin the authorization flow:

```bash
rclone authorize "onedrive" "eyJyZWdpb24iOiJjbiIsInRlbmFudCI6IkR5bmFtaWMifQ"
```

rclone will open a browser window (or provide a URL) where you can sign in with
your OneDrive credentials. Complete the login to allow rclone to create an
authorization token.

## Capture the Token

After successful authentication, rclone prints an authorization token in the
terminal. Copy the entire JSON block that looks similar to:

```json
{ "access_token": "...", "expiry": "..." }
```

This token will be used to update your `rclone.conf`.

## Ensure the OneDrive Remote Exists

If you have not already configured the OneDrive remote on the machine, run the
interactive tool:

```bash
rclone config
```

Select the existing OneDrive remote or create a new one with the `onedrive`
backend. Accept the default options unless you have custom requirements, then
quit the tool to save your changes.

## Update the Token Manually

To paste the token without the helper script, run:

```bash
rclone config update onedrive token '{"access_token":"..."}' --config ~/.config/rclone/rclone.conf --non-interactive
```

Replace `onedrive` with your remote name and update the config path if you keep
`rclone.conf` elsewhere.

## Automate the Token Update

You can script the authorization flow with the bundled helper:

```bash
tsx scripts/onedrive/authorize.ts --remote onedrive --config ~/.config/rclone/rclone.conf
```

The script calls `rclone authorize` with the Dynamic tenant payload, parses the
token output, and updates the chosen remote using `rclone config update`. Ensure
the remote already exists (see above). If you already have a token from another
machine, pass it directly and perform a dry run:

```bash
tsx scripts/onedrive/authorize.ts \
  --token '{"access_token":"..."}' \
  --remote onedrive \
  --config ~/.config/rclone/rclone.conf \
  --dry-run
```

## Verify the Configuration

Test the connection to OneDrive to ensure the token works:

```bash
rclone lsd onedrive:
```

Replace `onedrive` with the name of your remote if it differs.

If the command lists your OneDrive directories without errors, the configuration
was successful.
