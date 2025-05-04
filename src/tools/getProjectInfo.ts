import { buildFileTree } from "../utils/project";
import { getTechStack as getProjectTechStack } from "../utils/project";

export async function getProjectStructure(root: string) {
    const tree = await buildFileTree(root, root);
    return `Project Structure:\n${root}\n${tree}`
}

export async function getTechStack(root: string) {
    const techStack = await getProjectTechStack(root);
    
    return `Tech Stack:\n${techStack.join(", ")}`;
}

console.log(await getProjectStructure('/Users/ahpx/Code/WeChat/Uexus/uexus-dashboard/'))