import * as vscode from "vscode";
import { VersionsAtlasHoverProvider } from "./hoverProvider";
import { clearCache } from "./packageFetcher";

export function activate(context: vscode.ExtensionContext) {
  console.log("Versions Atlas is now active");

  // Register hover provider for JSON files (package.json)
  const hoverProvider = vscode.languages.registerHoverProvider(
    { language: "json", pattern: "**/package.json" },
    new VersionsAtlasHoverProvider()
  );

  // Register refresh cache command
  const refreshCommand = vscode.commands.registerCommand(
    "versionsAtlas.refreshCache",
    () => {
      clearCache();
      vscode.window.showInformationMessage("Versions Atlas cache cleared");
    }
  );

  context.subscriptions.push(hoverProvider, refreshCommand);
}

export function deactivate() {
  clearCache();
}
