import fs from "node:fs";
import path from "node:path";
import getTypeScriptConfig from "./tsconfig";

type ResolvedPath = {
  isExternal: boolean,
  isRelative: boolean,
  absolute: string,
};

function isFile(targetPath: string) {
  if (!fs.existsSync(targetPath)) return false;
  return fs.statSync(targetPath).isFile();
}

function resolveAlias(targetPath: Readonly<string>) {
  let tp = targetPath;
  const tsconfig = getTypeScriptConfig();
  const paths = tsconfig.compilerOptions.paths;
  for (const [key, value] of Object.entries(paths)) {
    tp = tp.replace(key.replace("*", ""), value[0].replace("*", ""));
  }
  return tp;
}

function resolveFile(filePath: string, extensions: string[]): string {
  if (isFile(filePath)) return filePath;
  for (const extension of extensions) {
    const ownPath = `${filePath}.${extension}`;
    const indexPath = path.join(filePath, `index.${extension}`);
    if (isFile(ownPath)) return ownPath;
    if (isFile(indexPath)) return indexPath;
  }
  throw new Error(`File not found: ${filePath}`);
}

function isExternalModule(targetPath: string) {
  return !(/^\.\.?\//).test(resolveAlias(targetPath));
}

function getFullPath(targetPath: string, isRelative: boolean, currentPath?: string) {
  const rootPath = (isRelative && currentPath) ? path.dirname(currentPath) : process.cwd();
  const filePath = path.resolve(rootPath, resolveAlias(targetPath));
  return resolveFile(filePath, ["tsx", "ts", "jsx", "js"]);
}

export function resolvePath(targetPath: Readonly<string>, currentPath?: string): ResolvedPath {
  const isRelative = (/^\.\.?\//).test(targetPath);
  const isExternal = isExternalModule(targetPath);
  return {
    isExternal,
    isRelative,
    absolute: isExternal ? targetPath : getFullPath(targetPath, isRelative, currentPath),
  };
}
