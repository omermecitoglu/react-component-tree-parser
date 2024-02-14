import path from "node:path";
import getTypeScriptConfig from "./tsconfig";

export function fixPath(targetPath: string) {
  let tp = targetPath.endsWith(".tsx") ? `${targetPath}` : `${targetPath}.tsx`;
  const tsconfig = getTypeScriptConfig();
  const paths = tsconfig.compilerOptions.paths;
  for (const [key, value] of Object.entries(paths)) {
    tp = tp.replace(key.replace("*", ""), value[0].replace("*", ""));
  }
  return tp;
}

export function getFullPath(currentPath: Readonly<string>, targetPath: string, isRelative: boolean) {
  if (isRelative) {
    return path.resolve(path.dirname(currentPath), targetPath);
  }
  return path.resolve(process.cwd(), targetPath);
}
