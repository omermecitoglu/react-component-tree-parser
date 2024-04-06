import fs from "node:fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { v4 as uuid } from "uuid";
import { resolvePath } from "./core/path";
import type { JSXElement, Node } from "@babel/types";

type Connection = {
  modules: string[],
  path: string,
};

type Component = {
  name: string,
  isClient: boolean,
  isList: boolean,
  isLogical: boolean,
  isConditional: boolean,
  link: string,
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

function catchLogicalExpression(node: Node) {
  if (node.type !== "JSXExpressionContainer") return null;
  if (node.expression.type !== "LogicalExpression") return null;
  if (node.expression.operator !== "&&") return null;
  if (node.expression.right.type !== "JSXElement") return null;
  return node.expression.right;
}

function catchConditionalExpression(node: Node) {
  if (node.type !== "JSXExpressionContainer") return null;
  if (node.expression.type !== "ConditionalExpression") return null;
  if (node.expression.consequent.type !== "JSXElement") return null;
  if (node.expression.alternate.type !== "JSXElement") return null;
  return [
    node.expression.consequent,
    node.expression.alternate,
  ];
}

function getComponentChildren(children: Node[], connections: Connection[], isClient: boolean) {
  return children.reduce<Component[]>((collection, child) => {
    if (child.type === "JSXElement") {
      return [...collection, generateComponent(child, connections, isClient, false, false, false)];
    }
    const listItem = catchListedElement(child);
    if (listItem) {
      return [...collection, generateComponent(listItem, connections, isClient, true, false, false)];
    }
    const logical = catchLogicalExpression(child);
    if (logical) {
      return [...collection, generateComponent(logical, connections, isClient, false, true, false)];
    }
    const conditional = catchConditionalExpression(child);
    if (conditional) {
      const link = uuid();
      return [
        ...collection,
        ...conditional.map(e => generateComponent(e, connections, isClient, false, false, true, link)),
      ];
    }
    return collection;
  }, []);
}

function isClientComponent(componentPath: string) {
  const path = resolvePath(componentPath);
  const code = fs.readFileSync(path.absolute, "utf8");
  return (/["']use client["']/).test(code);
}

function generateComponent(
  node: JSXElement,
  connections: Connection[],
  forcedClient: boolean,
  isList: boolean,
  isLogical: boolean,
  isConditional: boolean,
  link: string = "",
): Component {
  const name = getComponentName(node);
  const connection = connections.find(c => c.modules.includes(name));
  const isClient = forcedClient || (connection ? isClientComponent(connection.path) : false);
  return {
    name,
    isClient,
    isList,
    isLogical,
    isConditional,
    link,
    isConnection: !!connection,
    ownChildren: connection ? parseComponentTree(connection.path, isClient) : [],
    children: getComponentChildren(node.children, connections, forcedClient),
  };
}

export default function parseComponentTree(componentPath: string, forcedClient: boolean) {
  try {
    const path = resolvePath(componentPath);
    const code = fs.readFileSync(path.absolute, "utf8");
    const isClient = forcedClient || (/["']use client["']/).test(code);
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
    const connections: Connection[] = [];
    const components: Component[] = [];
    traverse(ast, {
      ImportDeclaration(p) {
        const modulePath = resolvePath(p.node.source.value, path.absolute);
        if (!modulePath.isExternal) {
          connections.push({
            modules: p.node.specifiers.map(s => s.local.name),
            path: modulePath.absolute,
          });
        }
      },
      JSXElement(p) {
        if (components.length) return;
        const rootElement = p.parent.type === "JSXFragment" ? p.parent : p.node;
        if (rootElement.type === "JSXElement") {
          components.push(generateComponent(rootElement, connections, isClient, false, false, false));
        } else { // Fragment
          components.push(...getComponentChildren(rootElement.children, connections, isClient));
        }
      },
    });
    return components;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("EISDIR")) {
      throw new Error(`Invalid component path: ${componentPath}`);
    }
    throw error;
  }
}
