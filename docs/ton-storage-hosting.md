# Hosting dynamiccapital.ton on TON Storage

The steps below walk through publishing a static website (HTML, CSS, JavaScript,
and assets) to TON Storage and mapping it to the `dynamiccapital.ton` domain
that is already registered in Tonkeeper.

## 1. Prepare the Website Bundle

- Organize the project as a static site with an entry point (for example
  `index.html`) and any supporting assets (`styles.css`, `script.js`, `images/`,
  etc.).
- Verify that asset paths are relative (e.g. `./images/logo.png`) so they
  resolve correctly once hosted from TON Storage.
- Optionally run a production build step (if your framework supports it) so that
  only the compiled static output is uploaded.

## 2. Install TON CLI

You need the TON command-line tools on the workstation that will upload the site
bundle.

- **macOS / Linux**: follow the installation instructions from the
  [TON CLI repository](https://github.com/toncenter/ton-cli).
- **Docker**: pull the pre-built image instead of installing locally:
  ```bash
  docker pull toncenter/ton
  ```
- Confirm the CLI works by running `ton-storage-cli --help` (or
  `docker run --rm toncenter/ton ton-storage-cli --help` when using Docker).

## 3. Upload Files to TON Storage

Use `ton-storage-cli add` to push each file (or directory) to TON Storage and
capture the resulting content hashes.

```bash
ton-storage-cli add ./dist/index.html
```

- Repeat for every file or run `ton-storage-cli add ./dist` to upload the entire
  directory in one command.
- Record the root content address returned by the CLI (formatted like
  `0:abc12345def6789...`). This hash identifies the static bundle.

## 4. Create the TON Site (ADNL)

TON websites are served through ADNL addresses that reference the uploaded
content.

```bash
ton-storage-cli site create ./dist
```

- The command outputs an ADNL address (a hex string). This will be connected to
  the `.ton` domain in the next step.
- You can rerun the command whenever you update the site; each run produces a
  fresh ADNL pointing at the latest uploaded content hash.

## 5. Link the ADNL to `dynamiccapital.ton`

Inside Tonkeeper (or any TON DNS manager you use):

1. Open **DNS settings** for `dynamiccapital.ton`.
2. Locate the **TON Site (ADNL)** record type.
3. Paste the ADNL address generated in the previous step and save the record.

Changes usually propagate within a few minutes.

## 6. Validate the Deployment

- Open Tonkeeper (or another TON-aware browser) and visit `dynamiccapital.ton`.
- Confirm that the site loads the uploaded content. If something is missing,
  re-check relative paths and re-run the upload/ADNL creation steps.

## Optional Enhancements

- **Subdomains**: repeat the linking process for entries such as
  `fund.dynamiccapital.ton` or `vip.dynamiccapital.ton` by creating additional
  ADNL records.
- **Web2 Gateway Access**: configure a gateway service (e.g. `tonhub.com`) to
  expose the TON site via a traditional HTTPS URL for users without
  TON-compatible browsers.
- **Smart Contract Integrations**: publish staking pools, dashboards, or other
  dApps that live on TON and link them from the hosted site to expand
  functionality.
