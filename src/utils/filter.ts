import { readFile } from "node:fs/promises";
import { join, relative, sep, isAbsolute, normalize } from "node:path";
import { existsSync } from "node:fs";

export type GitIgnoreRule = {
    pattern: string;
    isNegated: boolean;
    isDirectory: boolean;
};

export async function parseGitIgnoreFile(rootPath: string): Promise<GitIgnoreRule[]> {
    const gitIgnorePath = join(rootPath, ".gitignore");

    if (!existsSync(gitIgnorePath)) {
        return [];
    }

    try {
        const content = await readFile(gitIgnorePath, "utf-8");
        return content
            .split("\n")
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .map(pattern => {
                let isNegated = false;
                if (pattern.startsWith("!")) {
                    isNegated = true;
                    pattern = pattern.slice(1);
                }

                const isDirectory = pattern.endsWith("/");
                if (isDirectory) {
                    pattern = pattern.slice(0, -1);
                }

                return {
                    pattern: pattern.trim(),
                    isNegated,
                    isDirectory
                };
            });
    } catch (error) {
        console.error("Error reading .gitignore:", error);
        return [];
    }
}

export function shouldIgnore(
    path: string,
    rootPath: string,
    gitIgnoreRules: GitIgnoreRule[]
): boolean {
    if (gitIgnoreRules.length === 0) {
        return true;
    }
    // Always include the .gitignore file itself
    if (path.endsWith(".gitignore")) {
        return false;
    }

    // Get relative path for comparison
    const relativePath = relative(rootPath, path);

    // Process each rule in order, with later rules overriding earlier ones
    let ignored = false;

    for (const rule of gitIgnoreRules) {
        const { pattern, isNegated, isDirectory } = rule;

        // Simple pattern matching for now
        // This can be extended with more complex glob pattern matching
        const isMatch = matchPattern(relativePath, pattern, isDirectory);

        if (isMatch) {
            ignored = !isNegated;
        }
    }

    return ignored;
}

function matchPattern(path: string, pattern: string, isDirectoryPattern: boolean): boolean {
    // Normalize path separators for consistency
    const normalizedPath = normalize(path).split(sep).join("/");

    // Full path match
    if (pattern === normalizedPath) {
        return true;
    }

    // Check for direct directory matches (like 'nest' in gitignore)
    const pathParts = normalizedPath.split("/");
    for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === pattern) {
            return true;
        }
    }

    // Directory-only patterns should only match directories
    if (isDirectoryPattern && !existsSync(path)) {
        return false;
    }

    // Simple glob pattern matching
    if (pattern.includes("*")) {
        const regexPattern = pattern
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*");

        const regex = new RegExp(`^${regexPattern}$`);
        if (regex.test(normalizedPath)) {
            return true;
        }

        // Check if it matches any parent directory or file
        for (let i = 0; i < pathParts.length; i++) {
            const partialPath = pathParts.slice(0, i + 1).join("/");
            if (regex.test(partialPath)) {
                return true;
            }
        }
    }

    // Check if pattern is a directory prefix
    if (normalizedPath.startsWith(`${pattern}/`)) {
        return true;
    }

    return false;
}