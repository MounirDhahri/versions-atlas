import * as vscode from "vscode";
import { getProjects } from "./configManager";
import { fetchPackageJson, getDependencyVersion } from "./packageFetcher";
import { DependencyVersion } from "./types";

export class VersionsAtlasHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    // Only process package.json files
    if (!document.fileName.endsWith("package.json")) {
      return null;
    }

    const dependencyInfo = this.getDependencyAtPosition(document, position);
    if (!dependencyInfo) {
      return null;
    }

    const { name: dependencyName, version: currentVersion, range } = dependencyInfo;

    const projects = getProjects();
    if (projects.length === 0) {
      return null;
    }

    const versions = await this.getVersionsAcrossProjects(dependencyName);

    if (versions.length === 0) {
      return null;
    }

    const markdown = this.formatHoverContent(
      dependencyName,
      currentVersion,
      versions
    );

    return new vscode.Hover(markdown, range);
  }

  private getDependencyAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { name: string; version: string; range: vscode.Range } | null {
    const line = document.lineAt(position.line).text;

    // Match dependency line pattern: "dependency-name": "version"
    const dependencyPattern = /^\s*"([^"]+)"\s*:\s*"([^"]+)"/;
    const match = line.match(dependencyPattern);

    if (!match) {
      return null;
    }

    const [, name, version] = match;

    // Check if we're in a dependencies section
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Find if cursor is within any dependencies section
    const dependencySections = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ];

    let isInDependencySection = false;
    for (const section of dependencySections) {
      const sectionPattern = new RegExp(`"${section}"\\s*:\\s*\\{`, "g");
      let sectionMatch;

      while ((sectionMatch = sectionPattern.exec(text)) !== null) {
        const sectionStart = sectionMatch.index;
        const sectionEnd = this.findClosingBrace(text, sectionStart);

        if (offset >= sectionStart && offset <= sectionEnd) {
          isInDependencySection = true;
          break;
        }
      }

      if (isInDependencySection) break;
    }

    if (!isInDependencySection) {
      return null;
    }

    // Calculate range for the dependency name
    const nameStart = line.indexOf(`"${name}"`);
    const nameEnd = nameStart + name.length + 2;
    const range = new vscode.Range(
      position.line,
      nameStart,
      position.line,
      nameEnd
    );

    return { name, version, range };
  }

  private findClosingBrace(text: string, startIndex: number): number {
    let depth = 0;
    let inString = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : "";

      if (char === '"' && prevChar !== "\\") {
        inString = !inString;
      } else if (!inString) {
        if (char === "{") {
          depth++;
        } else if (char === "}") {
          depth--;
          if (depth === 0) {
            return i;
          }
        }
      }
    }

    return text.length;
  }

  private async getVersionsAcrossProjects(
    dependencyName: string
  ): Promise<DependencyVersion[]> {
    const projects = getProjects();
    const versions: DependencyVersion[] = [];

    const results = await Promise.all(
      projects.map(async (project) => {
        const packageJson = await fetchPackageJson(project);
        if (!packageJson) {
          return {
            projectName: project.name,
            version: null,
          };
        }

        const version = getDependencyVersion(packageJson, dependencyName);
        return {
          projectName: project.name,
          version,
        };
      })
    );

    return results;
  }

  private formatHoverContent(
    dependencyName: string,
    currentVersion: string,
    versions: DependencyVersion[]
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportHtml = true;

    md.appendMarkdown(`**📦 ${dependencyName}** versions across projects:\n\n`);

    for (const { projectName, version } of versions) {
      const displayVersion = version || "_not used_";
      md.appendMarkdown(`• **${projectName}**: \`${displayVersion}\`\n\n`);
    }

    md.appendMarkdown(`---\n\n`);
    md.appendMarkdown(`**Current file**: \`${currentVersion}\``);

    return md;
  }
}
