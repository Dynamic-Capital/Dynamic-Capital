# DigitalOcean App Logs

Guidelines for retrieving build, deploy, runtime, and crash logs for the
DigitalOcean App.

## Automation

1. **Install and authenticate `doctl`**
   - Download and install the DigitalOcean CLI.
   - Create a personal access token.
   - Authenticate: `doctl auth init`.
2. **List apps and get the app ID**
   - `doctl apps list`
3. **Fetch logs via CLI**
   - `doctl apps logs <app-id> <component-name> --type build`
   - Omit `<component-name>` for all components.
   - Use `--type run_restarted` for crash logs.
4. **Retrieve logs via API**
   - Export token: `export DIGITALOCEAN_TOKEN=...`
   - Send request:
     ```bash
     curl -X GET \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
       "https://api.digitalocean.com/v2/apps/{app_id}/deployments/{deployment_id}/components/{component_name}/logs"
     ```
   - Python (PyDo) example:
     ```python
     import os
     from pydo import Client
     ```

   client = Client(token=os.environ.get("DIGITALOCEAN_TOKEN")) get_resp =
   client.apps.get_logs(app_id="4f6c71e2", deployment_id="3aa4d20e",
   component_name="component")
   ```
   ```

## Control Panel

1. **Activity Logs** – Apps → _Your App_ → **Activity** shows deployment
   timeline.
2. **Deployment Logs** – Activity tab → click a deployment to view Build and
   Deploy logs.
3. **Runtime Logs** – **Runtime Logs** tab → select a resource to view live
   logs.
4. **Crash Logs** – Access with `doctl apps logs <app-id> --type=run_restarted`
   (optionally specify a component).

## Troubleshooting

If the interface shows **Deploy logs are not available**, the logs may not yet
be generated or have expired. Use the
`doctl apps logs <app-id>
<component-name> --type build` command or the API
above to fetch them shortly after deployment.
