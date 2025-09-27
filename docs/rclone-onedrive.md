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

## Update `rclone.conf`

1. Run `rclone config`.
2. Choose the remote corresponding to OneDrive or create a new remote.
3. When prompted for advanced configuration, select **Yes** to edit the config
   manually.
4. Paste the JSON token you copied into the `token` field of your OneDrive
   remote configuration.
5. Save and exit the config tool.

## Automate the Token Update

You can script the authorization flow with the bundled helper:

```bash
tsx scripts/onedrive/authorize.ts --remote onedrive --config ~/.config/rclone/rclone.conf
```

The script calls `rclone authorize` with the Dynamic tenant payload, parses the
token output, and writes it to the specified remote in your `rclone.conf`. If
you already have a token from another machine, pass it directly and perform a
dry run:

```bash
tsx scripts/onedrive/authorize.ts --token '{"access_token":"..."}' --remote onedrive --config ~/.config/rclone/rclone.conf --dry-run
```

## Verify the Configuration

Test the connection to OneDrive to ensure the token works:

```bash
rclone lsd onedrive:
```

Replace `onedrive` with the name of your remote if it differs.

If the command lists your OneDrive directories without errors, the configuration
was successful.
