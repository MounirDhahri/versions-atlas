import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CachedPackageJson, PackageJson, ProjectConfig } from "./types";
import { getCacheTTL, getGitHubToken } from "./configManager";

const cache = new Map<string, CachedPackageJson>();

export function clearCache(): void {
  cache.clear();
}

function getCacheKey(project: ProjectConfig): string {
  return project.localPath || project.packageJsonUrl || project.name;
}

function expandPath(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

async function fetchFromLocal(localPath: string): Promise<PackageJson | null> {
  try {
    const expandedPath = expandPath(localPath);
    const content = fs.readFileSync(expandedPath, "utf-8");
    return JSON.parse(content) as PackageJson;
  } catch (error) {
    console.error(`Failed to read local file ${localPath}:`, error);
    return null;
  }
}

async function fetchFromRemote(url: string): Promise<PackageJson | null> {
  try {
    const token = getGitHubToken();
    const headers: Record<string, string> = {};

    if (token && url.includes("github")) {
      headers["Authorization"] = `token ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    return (await response.json()) as PackageJson;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

export async function fetchPackageJson(
  project: ProjectConfig
): Promise<PackageJson | null> {
  const cacheKey = getCacheKey(project);
  const cached = cache.get(cacheKey);
  const ttl = getCacheTTL();

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  let data: PackageJson | null = null;

  if (project.localPath) {
    data = await fetchFromLocal(project.localPath);
  } else if (project.packageJsonUrl) {
    data = await fetchFromRemote(project.packageJsonUrl);
  }

  if (data) {
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  return data;
}

export function getDependencyVersion(
  packageJson: PackageJson,
  dependencyName: string
): string | null {
  return (
    packageJson.dependencies?.[dependencyName] ||
    packageJson.devDependencies?.[dependencyName] ||
    packageJson.peerDependencies?.[dependencyName] ||
    packageJson.optionalDependencies?.[dependencyName] ||
    null
  );
}
