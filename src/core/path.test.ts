import {describe,it,expect} from "@jest/globals"
import path from "node:path";
import { resolvePath } from "./path";

describe("resolvePath function", () => {
  const rootComponentPath = path.resolve(__dirname, "../test/root.tsx");

  it("should determine correctly if the path is external", () => {
    expect(resolvePath("react", rootComponentPath).isExternal).toBe(true);
    expect(resolvePath("./module1", rootComponentPath).isExternal).toBe(false);
    expect(resolvePath("../test/module1", rootComponentPath).isExternal).toBe(false);
    expect(resolvePath("~/test/module1", rootComponentPath).isExternal).toBe(false);
  });

  it("should determine correctly if the path is relative", () => {
    expect(resolvePath("react", rootComponentPath).isRelative).toBe(false);
    expect(resolvePath("./module1", rootComponentPath).isRelative).toBe(true);
    expect(resolvePath("../test/module1", rootComponentPath).isRelative).toBe(true);
    expect(resolvePath("~/test/module1", rootComponentPath).isRelative).toBe(false);
  });

  it("should resolve absolute paths correctly", () => {
    expect(resolvePath("react", rootComponentPath).absolute).toBe("react");
    const modulePath1 = resolvePath("./module1", rootComponentPath).absolute;
    expect(modulePath1).toBe(path.resolve(__dirname, "../test/module1.tsx"));
    const modulePath2 = resolvePath("~/test/module2", rootComponentPath).absolute;
    expect(modulePath2).toBe(path.resolve(__dirname, "../test/module2/index.tsx"));
    const modulePath3 = resolvePath("../test/module1", rootComponentPath).absolute;
    expect(modulePath3).toBe(path.resolve(__dirname, "../test/module1.tsx"));
  });
});
