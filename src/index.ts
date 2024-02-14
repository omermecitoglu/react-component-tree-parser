import fs from "node:fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { fixPath, getFullPath } from "./core/path";
import type { JSXElement, Node } from "@babel/types";

type Connection = {
  modules: string[],
  path: string,
};

type Component = {
  name: string,
  isClient: boolean,
  isList: boolean,
  isConnection: boolean,
  ownChildren: Component[],
  children: Component[],
};

function getComponentName(node: JSXElement) {
  const identifier = node.openingElement.name;
  switch (identifier.type) {
    case "JSXIdentifier":
      return identifier.name;
    case "JSXMemberExpression":
      return identifier.property.name;
    default:
      throw new Error("unknown identifier");
  }
}

function catchListedElement(node: Node) {
  if (node.type !== "JSXExpressionContainer") return null;
  if (node.expression.type !== "CallExpression") return null;
  if (node.expression.callee.type !== "MemberExpression") return null;
  if (node.expression.callee.property.type !== "Identifier") return null;
  if (node.expression.callee.property.name !== "map") return null;
  if (node.expression.arguments.length !== 1) return null;
  const argument = node.expression.arguments[0];
  if (argument.type !== "ArrowFunctionExpression") return null;
  if (argument.body.type !== "JSXElement") return null;
  return argument.body;
}

function getComponentChildren(children: Node[], connections: Connection[], isClient: boolean) {
  return children.reduce<Component[]>((collection, child) => {
    if (child.type === "JSXElement") {
      return [...collection, generateComponent(child, connections, isClient, false)];
    } else {
      const listItem = catchListedElement(child);
      if (listItem) {
        return [...collection, generateComponent(listItem, connections, isClient, true)];
      }
    }
    return collection;
  }, []);
}

function generateComponent(node: JSXElement, connections: Connection[], isClient: boolean, isList: boolean): Component {
  const name = getComponentName(node);
  const connection = connections.find(c => c.modules.includes(name));
  return {
    name,
    isClient,
    isList,
    isConnection: !!connection,
    ownChildren: connection ? parseComponentTree(connection.path, isClient) : [],
    children: getComponentChildren(node.children, connections, false),
  };
}

export default function parseComponentTree(componentPath: string, forcedClient: boolean) {
  const code = fs.readFileSync(componentPath, "utf8");
  const isClient = forcedClient || (/["']use client["']/).test(code);
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  const connections: Connection[] = [];
  const components: Component[] = [];
  traverse(ast, {
    ImportDeclaration(p) {
      const importPath = p.node.source.value;
      const isRelative = (/^\.\.?\//).test(importPath);
      const resolvedPath = fixPath(importPath);
      if ((/^\.\.?\//).test(resolvedPath)) {
        connections.push({
          modules: p.node.specifiers.map(s => s.local.name),
          path: getFullPath(componentPath, resolvedPath, isRelative),
        });
      }
    },
    JSXElement(p) {
      if (components.length) return;
      const rootElement = p.parent.type === "JSXFragment" ? p.parent : p.node;
      if (rootElement.type === "JSXElement") {
        components.push(generateComponent(rootElement, connections, isClient, false));
      } else {
        components.push(...getComponentChildren(rootElement.children, connections, isClient));
      }
    },
  });
  return components;
}
