import { readFile } from "node:fs/promises";
import { join, relative, sep, normalize } from "node:path";
import { existsSync } from "node:fs";

export type GitIgnoreRule = {
    pattern: string;
    isNegated: boolean;
    isDirectory: boolean;
};

// Tech stack detection types
export type ConfigFileCheck = {
    file: string;
    tech: string;
};

export type DependencyTechMap = Record<string, string>;

export type OrgTechMap = Record<string, string>;

// Tech stack detection configuration
export const CONFIG_FILE_CHECKS: ConfigFileCheck[] = [
    { file: 'tsconfig.json', tech: 'TypeScript' },
    { file: 'jsconfig.json', tech: 'JavaScript' },
    { file: 'components.json', tech: 'Shadcn UI' },
    { file: 'bun.lock', tech: 'Bun' },
    { file: 'yarn.lock', tech: 'Yarn' },
    { file: 'pnpm-lock.yaml', tech: 'pnpm' },
    { file: 'deno.json', tech: 'Deno' },
    { file: 'deno.jsonc', tech: 'Deno' },
    { file: 'vite.config.js', tech: 'Vite' },
    { file: 'vite.config.ts', tech: 'Vite' },
    { file: 'webpack.config.js', tech: 'Webpack' },
    { file: 'webpack.config.ts', tech: 'Webpack' },
    { file: 'next.config.js', tech: 'Next.js' },
    { file: 'next.config.ts', tech: 'Next.js' },
    { file: 'svelte.config.js', tech: 'Svelte' },
    { file: 'svelte.config.ts', tech: 'Svelte' },
    { file: 'astro.config.mjs', tech: 'Astro' },
    { file: 'astro.config.ts', tech: 'Astro' },
    { file: 'remix.config.js', tech: 'Remix' },
    { file: 'tailwind.config.js', tech: 'Tailwind CSS' },
    { file: 'tailwind.config.ts', tech: 'Tailwind CSS' },
    { file: 'jest.config.js', tech: 'Jest' },
    { file: 'jest.config.ts', tech: 'Jest' },
    { file: 'vitest.config.ts', tech: 'Vitest' },
    { file: 'cypress.config.js', tech: 'Cypress' },
    { file: 'playwright.config.ts', tech: 'Playwright' },
];

// Dependency to tech mapping
export const DEP_TO_TECH_MAP: DependencyTechMap = {
    // Frontend frameworks and libraries
    'react': 'React',
    'vue': 'Vue.js',
    'angular': 'Angular',
    'svelte': 'Svelte',
    'preact': 'Preact',
    'solid-js': 'Solid.js',
    'lit': 'Lit',

    // UI frameworks
    '@mui/material': 'Material UI',
    '@chakra-ui/react': 'Chakra UI',
    '@mantine/core': 'Mantine',
    'antd': 'Ant Design',
    'bootstrap': 'Bootstrap',
    'tailwindcss': 'Tailwind CSS',

    // Meta frameworks
    'next': 'Next.js',
    'nuxt': 'Nuxt.js',
    'sveltekit': 'SvelteKit',
    'astro': 'Astro',
    'remix': 'Remix',
    'gatsby': 'Gatsby',

    // Backend frameworks
    'express': 'Express',
    'fastify': 'Fastify',
    'koa': 'Koa',
    'nest': 'NestJS',
    'hapi': 'Hapi',
    '@nestjs/core': 'NestJS',

    // State management
    'redux': 'Redux',
    'recoil': 'Recoil',
    'jotai': 'Jotai',
    'zustand': 'Zustand',
    'mobx': 'MobX',
    'xstate': 'XState',

    // Data fetching
    'graphql': 'GraphQL',
    '@apollo/client': 'Apollo Client',
    'react-query': 'React Query',
    '@tanstack/react-query': 'TanStack Query',
    'swr': 'SWR',

    // Testing
    'jest': 'Jest',
    'vitest': 'Vitest',
    '@testing-library/react': 'React Testing Library',
    'cypress': 'Cypress',
    'playwright': 'Playwright',

    // Utilities
    'zod': 'Zod',
    'yup': 'Yup',
    'lodash': 'Lodash',
    'ramda': 'Ramda',
    'date-fns': 'date-fns',
    'dayjs': 'Day.js',
    'axios': 'Axios',
    'ky': 'Ky',

    // Build tools
    'vite': 'Vite',
    'webpack': 'Webpack',
    'rollup': 'Rollup',
    'esbuild': 'esbuild',
    'parcel': 'Parcel',

    // Others
    '@modelcontextprotocol/sdk': 'Model Context Protocol',
};

// Organization name to tech mapping
export const ORG_TO_TECH_MAP: OrgTechMap = {
    'types': 'TypeScript',
    'typescript-eslint': 'ESLint',
    'testing-library': 'Testing Library',
    'storybook': 'Storybook',
    'emotion': 'Emotion',
    'styled': 'Styled Components',
    'tanstack': 'TanStack',
    'reduxjs': 'Redux',
    'apollo': 'Apollo',
    'supabase': 'Supabase',
    'prisma': 'Prisma',
    'vercel': 'Vercel',
    'aws': 'AWS SDK',
    'firebase': 'Firebase',
    'tarojs': 'Taro',
};

// Helper function to capitalize first letter of a string
export function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

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