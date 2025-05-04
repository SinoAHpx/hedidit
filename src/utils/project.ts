import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
    parseGitIgnoreFile,
    shouldIgnore,
    CONFIG_FILE_CHECKS,
    DEP_TO_TECH_MAP,
    ORG_TO_TECH_MAP,
    capitalizeFirstLetter
} from "./filter";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

export async function buildFileTree(rootPath: string, currentPath: string, indent = "") {
    let result = "";
    const gitIgnoreRules = await parseGitIgnoreFile(rootPath);
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
                entry.name.startsWith('.') ||
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
            result += await buildFileTree(rootPath, entryPath, newIndent);
        }
    }

    return result;
}

export async function getTechStack(rootPath: string): Promise<string[]> {
    const techStack: string[] = [];

    // Check for config files to infer technologies
    for (const { file, tech } of CONFIG_FILE_CHECKS) {
        if (await fileExists(join(rootPath, file))) {
            techStack.push(tech);
        }
    }

    // If no TypeScript or JavaScript is detected yet, default to JavaScript
    if (!techStack.includes('TypeScript') && !techStack.includes('JavaScript')) {
        techStack.push('JavaScript');
    }

    // Parse package.json for dependencies
    try {
        const packageJsonPath = join(rootPath, 'package.json');
        if (await fileExists(packageJsonPath)) {
            const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
            const dependencies = packageJson.dependencies || {};

            // Process dependencies
            for (const [dep, version] of Object.entries(dependencies)) {
                // Exact matches
                if (DEP_TO_TECH_MAP[dep]) {
                    if (!techStack.includes(DEP_TO_TECH_MAP[dep])) {
                        techStack.push(DEP_TO_TECH_MAP[dep]);
                    }
                    continue;
                }

                // Handle scoped packages (@org/pkg) and patterns
                if (dep.startsWith('@')) {
                    // Extract organization name
                    const orgName = dep.split('/')[0].slice(1);

                    if (ORG_TO_TECH_MAP[orgName] && !techStack.includes(ORG_TO_TECH_MAP[orgName])) {
                        techStack.push(ORG_TO_TECH_MAP[orgName]);
                    } 
                    else if (!techStack.includes(capitalizeFirstLetter(orgName))) {
                        // If not in our mapping but has multiple packages, use the org name as tech stack
                        const orgPackages = Object.keys(dependencies).filter(d =>
                            d.startsWith(`@${orgName}/`));

                        if (orgPackages.length > 1) {
                            techStack.push(capitalizeFirstLetter(orgName));
                        }
                    }
                }
            }

            // Check for Node.js
            if (packageJson.engines?.node ||
                packageJson.devDependencies?.['@types/node'] ||
                dependencies['@types/node'] ||
                !techStack.includes('Bun') ||
                !techStack.includes('Deno')) {
                techStack.push('Node.js');
            }
        }
    } catch (error) {
        console.error('Error parsing package.json:', error);
    }

    // Remove duplicates and return
    return [...new Set(techStack)];
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}