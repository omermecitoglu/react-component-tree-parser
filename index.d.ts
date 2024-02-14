export type Component = {
    name: string;
    isClient: boolean;
    isList: boolean;
    isConnection: boolean;
    ownChildren: Component[];
    children: Component[];
};
export default function parseComponentTree(componentPath: string, forcedClient: boolean): Component[];
export {};
