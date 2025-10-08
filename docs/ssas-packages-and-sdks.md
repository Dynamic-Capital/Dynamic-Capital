# SQL Server Analysis Services Packages & SDK Coverage

## Overview

Dynamic Capital's banking analytics and treasury reporting workflows depend on
SQL Server Analysis Services (SSAS) for cube modelling, scheduled refreshes, and
downstream Excel/Power BI consumption. To keep automation scripts, CI agents,
and analyst workstations aligned, install the full SSAS toolkit below before
running migration jobs or deploying new models.

## Core Desktop & Server Components

| Package / Extension                                         | Purpose                                                                                            | Installation Notes                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SQL Server Analysis Services (Tabular/Multidimensional)** | Hosts cubes and tabular models that feed treasury and risk dashboards.                             | Provision through SQL Server setup (`setup.exe` → _Analysis Services_). Enable both Tabular and Multidimensional when the environment supports hybrid deployments.                                                                                                      |
| **SQL Server Data Tools (SSDT) for Visual Studio 2022**     | Development environment for SSAS projects with schema diff, deployment, and unit-test tooling.     | Install Visual Studio 2022 (Community or higher) and add the "Data storage and processing" workload. Then install the [Analysis Services Projects](https://marketplace.visualstudio.com/items?itemName=ProBITools.MicrosoftAnalysisServicesModelingProjects) extension. |
| **SQL Server Management Studio (SSMS)**                     | Administrative console for processing, partitioning, XMLA scripting, and server health monitoring. | Download the latest SSMS build (18.x or 19.x). Confirm `Analysis Services` is available on the connection dialog.                                                                                                                                                       |
| **SQL Server Profiler (optional)**                          | Real-time trace for DAX/MDX query debugging and performance audits.                                | Included in SSMS installation; enable the "Analysis Services Profiler" feature when prompted.                                                                                                                                                                           |

## Client SDKs & Automation Libraries

| SDK / Library                                   | Usage                                                                                   | Installation                                                                                                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Microsoft.AnalysisServices (AMO)**            | Administrative automation (database deployment, role management, processing pipelines). | Install the NuGet package `Microsoft.AnalysisServices.retail.amd64` or `Microsoft.AnalysisServices.NetCore.retail.amd64` for .NET Core. On Windows hosts, the MSI bundle ships with SSMS (`AMO.msi`). |
| **Microsoft.AnalysisServices.Tabular**          | Tabular Object Model (TOM) scripting for metadata migrations and CI diff tooling.       | NuGet package `Microsoft.AnalysisServices.Tabular` (requires AMO). Include in CI projects and automation scripts.                                                                                     |
| **Microsoft.AnalysisServices.AdomdClient**      | Client driver for MDX/DAX query execution from .NET, Python (via clr), and Excel.       | Install the [MSOLAP](https://go.microsoft.com/fwlink/?linkid=829576) provider or add the NuGet `Microsoft.AnalysisServices.AdomdClient.retail.amd64`.                                                 |
| **Xmla (REST) endpoints / `TabularEditor` CLI** | Lightweight XMLA deployments and scripting from pipelines.                              | Install `TabularEditor` 2.x/3.x (CLI available via MSI). Configure service principals with XMLA endpoint access.                                                                                      |
| **PowerShell `SqlServer` module**               | Cmdlets for `Invoke-ProcessASDatabase`, role operations, backup/restore.                | `Install-Module SqlServer -Scope CurrentUser` on Windows PowerShell or PowerShell 7. Ensure TLS 1.2 is enabled for gallery downloads.                                                                 |
| **PowerShell `SqlServerDsc` / `xSQLServer`**    | Desired State Configuration (DSC) resources for SSAS server provisioning.               | `Install-Module SqlServerDsc`. Use to codify instance configuration, security, and service accounts.                                                                                                  |
| **Azure.AnalysisServices** (if applicable)      | Manage Azure Analysis Services instances (scale-out, firewall rules, credentials).      | `Install-Module Azure.AnalysisServices`. Requires Azure PowerShell Az module baseline.                                                                                                                |

## Validation Checklist

1. **Server availability** – Connect to the SSAS instance using SSMS and run
   `SELECT * FROM $SYSTEM.DBSCHEMA_CATALOGS` to verify metadata access.
2. **SDK discovery** – Run `Get-Module -ListAvailable SqlServer` and confirm
   version ≥ `22.x`. For .NET automation, ensure `dotnet list package` shows
   AMO/TOM assemblies.
3. **Developer tooling** – Launch Visual Studio, create a new _Analysis Services
   Tabular Project_, and confirm deployment to dev/test servers succeeds.
4. **Client connectivity** – Execute a smoke DAX query through ADOMD.NET or
   Excel PivotTable to confirm MSOLAP provider registration.
5. **CI automation** – Trigger the SSAS deployment pipeline; verify XMLA
   deploy + `Invoke-ProcessASDatabase` finish without missing assembly errors.

## Maintenance Guidance

- Track Microsoft release notes for AMO/TOM assemblies—breaking changes often
  ship alongside SQL Server cumulative updates.
- Reinstall MSOLAP when upgrading Office/Excel to ensure the OLE DB provider
  registers correctly.
- Mirror PowerShell module versions between local machines and CI agents to
  prevent drift in DSC/state scripts.
- Document service principal permissions for XMLA endpoints and rotate secrets
  alongside other infrastructure credentials.

## Related References

- [SQL Server Feature Pack Downloads](https://learn.microsoft.com/sql/database-engine/install-windows/sql-server-feature-pack-previous-versions)
  – legacy MSOLAP/ADOMD.NET installers.
- [Analysis Services Client Libraries](https://learn.microsoft.com/analysis-services/client-libraries)
  – official AMO, TOM, and ADOMD.NET download matrix.
- [Tabular Editor CLI](https://docs.tabulareditor.com/te2/Command-line.html) –
  scripting reference for automated builds.
