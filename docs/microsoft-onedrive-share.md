# Microsoft OneDrive Share Fetcher

Use the `fetch-drive-item` helper to inspect the metadata for a shared OneDrive
file or folder through the Microsoft Graph API.

## Prerequisites

- A Microsoft Graph access token with permission to read the shared item.
- The share link you want to inspect (for example, a link copied from OneDrive).

## Usage

1. Export the access token for the current shell session:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Fetch the drive item payload with `tsx`:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts "https://1drv.ms/f/..."
   ```

The helper converts the share link to the Base64-URL identifier expected by
Microsoft Graph before requesting the item. It prints the JSON response to
`stdout`, matching the behaviour of the original Python snippet.

## Listing folder contents

When the shared item is a folder you can render a readable tree of its contents
with the `list-drive-contents` helper. The script expands folder children
automatically when you pass the `--recursive` flag.

```bash
export ONEDRIVE_ACCESS_TOKEN="<token>"
tsx scripts/onedrive/list-drive-contents.ts "https://1drv.ms/f/..." --recursive
```

Each entry shows the item name, whether it is a file or folder, key metadata
such as size or MIME type, the last modified timestamp, and (when provided by
Graph) the OneDrive web URL for quick navigation.
