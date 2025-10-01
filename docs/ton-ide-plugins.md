# TON IDE Plugin Setup Guide

This guide covers the officially supported development environments for The Open
Network (TON) languages. The plugins below are maintained by the TON Core/TON
Blockchain teams and provide language intelligence for **Tolk, FunC, Fift, TL-B
schemas, Blueprint projects,** and related artifacts (BoC, TASM).

## JetBrains IDEs (IntelliJ IDEA, WebStorm, PyCharm, Rider)

Use the IntelliJ-based plugin when you prefer JetBrains tooling. It bundles
syntax highlighting, completion, navigation, inspections, and Blueprint-aware
build helpers for the TON toolchain.

### Marketplace installation

1. Open **Settings / Preferences → Plugins → Marketplace**.
2. Search for **"TON"** by **TON Core** (plugin ID `org.ton.intellij-ton`).
3. Click **Install** and allow the IDE to download the plugin from the JetBrains
   Marketplace.
4. Restart the IDE when prompted so inspections and run configurations register.

- Marketplace listing: <https://plugins.jetbrains.com/plugin/23382-ton>

### Manual installation from disk

If the IDE runs in an air-gapped network or the marketplace is unavailable:

1. Download the latest release archive (`.zip`) from the maintainers:
   - <https://github.com/andreypfau/intellij-ton/releases/latest>
2. Open **Settings / Preferences → Plugins**, then click the **gear** icon.
3. Choose **Install Plugin from Disk…** and select the downloaded archive.
4. Restart the IDE to activate the plugin and load language inspections.

After activation the JetBrains plugin recognizes Tolk, FunC, Fift (and Fift
assembly), TL-B schemas, TASM, BoC inspection, and Blueprint build/test actions
out of the box.

## Visual Studio Code & VS Code–based Editors

The official VS Code extension is powered by the TON Language Server and ships
with the same language coverage (Tolk, FunC, Fift assembly, TL-B, Blueprint, BoC
utilities).

### Marketplace installation flow

1. Open VS Code and head to **View → Extensions** (or press `Ctrl+Shift+X` /
   `Cmd+Shift+X`).
2. Search for **"TON"** published by **ton-core**.
3. Click **Install** on the extension named **TON** to pull it from the Visual
   Studio Marketplace.
4. Reload VS Code when prompted. The language server activates automatically on
   `.fc`, `.fif`, `.tlb`, `.tolk`, and Blueprint project files.

- Marketplace listing:
  <https://marketplace.visualstudio.com/items?itemName=ton-core.vscode-ton>
- Open VSX mirror (for VSCodium and Cursor):
  <https://open-vsx.org/extension/ton-core/vscode-ton>

### Manual `.vsix` installation

1. Download the latest `.vsix` package from one of the official mirrors:
   - Visual Studio Marketplace download button ("Download Extension")
   - Open VSX "Download" button
   - GitHub releases from the language server project:
     <https://github.com/ton-blockchain/ton-language-server/releases>
2. In VS Code open the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **Extensions: Install from VSIX…** and choose the downloaded file.
4. Reload the window if VS Code does not automatically enable the extension.
5. (Optional) Run **TON: Toolchain Doctor** from the Command Palette to confirm
   your local FunC, Fift, and Blueprint toolchain paths.

Once installed you get semantic highlighting, completions, go-to-definition,
refactors, Blueprint build/test automation, and BoC disassembly support across
TON languages.

## TON Web IDE

If you prefer a zero-install option, the hosted TON Web IDE bundles the same TON
Language Server in a browser workspace.

1. Navigate to <https://ide.ton.org/> (supported in Chromium-based browsers).
2. Sign in when prompted to unlock cloud workspaces and persistent storage.
3. Use **Create Project** to start from a Blueprint template or open existing
   repositories via Git integrations.
4. The web IDE preinstalls the TON toolchain and language services, so `.fc`,
   `.fif`, `.tlb`, and `.tolk` files gain the same diagnostics and Blueprint
   build actions as the desktop plugins.
5. Use the built-in terminal to run `tact`, `func`, `toncli`, or Blueprint
   scripts without locally installing toolchains.

Because the Web IDE mirrors the JetBrains and VS Code language coverage, you can
switch between local and cloud editors without losing
Tolk/FunC/Fift/TL-B/Blueprint features.

## Verification checklist

- [ ] Install the JetBrains plugin via Marketplace or disk and confirm
      highlighting in a `.fc` sample file.
- [ ] Install the VS Code extension (Marketplace or `.vsix`) and run **TON:
      Toolchain Doctor** to validate CLI access.
- [ ] Open <https://ide.ton.org/> and load a Blueprint template to verify
      browser-based tooling is available when onboarding contributors.
