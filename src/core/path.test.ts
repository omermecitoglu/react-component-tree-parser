import path from "node:path";
import { expect } from "chai";
import { resolvePath } from "./path";

describe("resolvePath function", () => {
  const rootComponentPath = path.resolve(__dirname, "../test/root.tsx");

  it("should determine correctly if the path is external", () => {
    expect(resolvePath("react", rootComponentPath).isExternal).to.be.true;
    expect(resolvePath("./module1", rootComponentPath).isExternal).to.be.false;
    expect(resolvePath("../test/module1", rootComponentPath).isExternal).to.be.false;
    expect(resolvePath("~/test/module1", rootComponentPath).isExternal).to.be.false;
  });

  it("should determine correctly if the path is relative", () => {
    expect(resolvePath("react", rootComponentPath).isRelative).to.be.false;
    expect(resolvePath("./module1", rootComponentPath).isRelative).to.be.true;
    expect(resolvePath("../test/module1", rootComponentPath).isRelative).to.be.true;
    expect(resolvePath("~/test/module1", rootComponentPath).isRelative).to.be.false;
  });

  it("should resolve absolute paths correctly", () => {
    expect(resolvePath("react", rootComponentPath).absolute).to.equal("react");
    const modulePath1 = resolvePath("./module1", rootComponentPath).absolute;
    expect(modulePath1).to.equal(path.resolve(__dirname, "../test/module1.tsx"));
    const modulePath2 = resolvePath("~/test/module2", rootComponentPath).absolute;
    expect(modulePath2).to.equal(path.resolve(__dirname, "../test/module2/index.tsx"));
    const modulePath3 = resolvePath("../test/module1", rootComponentPath).absolute;
    expect(modulePath3).to.equal(path.resolve(__dirname, "../test/module1.tsx"));
  });
});
