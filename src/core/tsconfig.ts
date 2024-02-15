import fs from "node:fs";
import path from "node:path";
import json5 from "json5";

type TypeScriptConfig = {
  compilerOptions: {
    paths: Record<string, string[]>,
  },
};

export default function getTypeScriptConfig(): TypeScriptConfig {
  try {
    const configPath = path.resolve(process.cwd(), "tsconfig.json");
    const rawJson = fs.readFileSync(configPath, "utf8");
    const parsedJson = json5.parse(rawJson);
    return {
      ...parsedJson,
      compilerOptions: {
        paths: {},
        ...parsedJson.compilerOptions,
      },
    };
  } catch {
    return { compilerOptions: { paths: {} } };
  }
}
