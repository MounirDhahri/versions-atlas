export interface ProjectConfig {
  name: string;
  packageJsonUrl?: string;
  localPath?: string;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface CachedPackageJson {
  data: PackageJson;
  timestamp: number;
}

export interface DependencyVersion {
  projectName: string;
  version: string | null;
}
