import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseGitIgnoreFile, shouldIgnore } from "./filter";
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
    const configChecks = [
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

    // Check each config file
    for (const { file, tech } of configChecks) {
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

            // Map dependencies to tech stack names
            const depToTech: Record<string, string> = {
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

            // Process dependencies
            for (const [dep, version] of Object.entries(dependencies)) {
                // Exact matches
                if (depToTech[dep]) {
                    if (!techStack.includes(depToTech[dep])) {
                        techStack.push(depToTech[dep]);
                    }
                    continue;
                }
                

                // Handle scoped packages (@org/pkg) and patterns
                if (dep.startsWith('@')) {
                    // Extract organization name
                    const orgName = dep.split('/')[0].slice(1);

                    // Map some common organizations to technologies
                    const orgToTech: Record<string, string> = {
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

                    if (orgToTech[orgName] && !techStack.includes(orgToTech[orgName])) {
                        techStack.push(orgToTech[orgName]);
                    } else if (!techStack.includes(capitalizeFirstLetter(orgName))) {
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

function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}