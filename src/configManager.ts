import * as vscode from "vscode";
import { ProjectConfig } from "./types";

export function getProjects(): ProjectConfig[] {
  const config = vscode.workspace.getConfiguration("versionsAtlas");
  return config.get<ProjectConfig[]>("projects") || [];
}

export function getCacheTTL(): number {
  const config = vscode.workspace.getConfiguration("versionsAtlas");
  return config.get<number>("cacheTTL") || 300000;
}

export function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN;
}
