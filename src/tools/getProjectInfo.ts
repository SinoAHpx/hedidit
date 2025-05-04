import { buildFileTree } from "../utils/project";

export async function getProjectStructure(root: string) {
    const tree = await buildFileTree(root, root);
    return `Project Structure:\n${root}\n${tree}`
}

export function getTechStack(root: string) {
    const techStack: string[] = [];
    return techStack;
}