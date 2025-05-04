import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseGitIgnoreFile, shouldIgnore, type GitIgnoreRule } from "../utils/filter";

export async function getProjectStructure(root: string) {
    const gitIgnoreRules = await parseGitIgnoreFile(root);
    const tree = await buildFileTree(root, root, "", gitIgnoreRules);
    return `Project Structure:\n${root}\n${tree}`
}

async function buildFileTree(rootPath: string, currentPath: string, indent = "", gitIgnoreRules: GitIgnoreRule[] = []) {
    let result = "";
    const entries = await readdir(currentPath, { withFileTypes: true });

    const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const entryPath = join(currentPath, entry.name);

        // Skip directories that are commonly ignored
        if (entry.isDirectory() &&
            (entry.name === "node_modules" ||
                entry.name === ".git" ||
                entry.name === "dist" ||
                entry.name === "build")) {
            continue;
        }

        // Skip files and directories based on .gitignore rules
        if (shouldIgnore(entryPath, rootPath, gitIgnoreRules)) {
            continue;
        }

        const isLast = i === sortedEntries.length - 1;
        const prefix = isLast ? "└── " : "├── ";

        result += `${indent}${prefix}${entry.name}\n`;

        if (entry.isDirectory()) {
            const newIndent = indent + (isLast ? "    " : "│   ");
            result += await buildFileTree(rootPath, entryPath, newIndent, gitIgnoreRules);
        }
    }

    return result;
}