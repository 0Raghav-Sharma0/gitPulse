const OVERVIEW_QUERY =
    /^(what is this|what does this|what's this|overview|tell me about this repo|explain this (repo|project)|describe this (repo|project)|what is this (repo|project))/i;

const FOLLOW_UP_QUERY =
    /^(summarize|summary|explain (more|that|this|it|again)|tell me more|can you clarify|clarify|elaborate|go on|continue|in short|tl;dr)/i;

const COMMON_OVERVIEW_FILES = [
    "README.md",
    "readme.md",
    "package.json",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml",
    "composer.json",
    "pom.xml",
    "build.gradle",
];

function pickMatchingFiles(fileTree: string[], names: string[], limit = 12): string[] {
    const matches = fileTree.filter((path) => {
        const base = path.split("/").pop() ?? path;
        return names.some((name) => base.toLowerCase() === name.toLowerCase() || path.endsWith(`/${name}`));
    });
    return [...new Set(matches)].slice(0, limit);
}

export function tryHeuristicFileSelection(
    question: string,
    fileTree: string[],
    history: { role: "user" | "model"; content: string }[] = [],
): string[] | null {
    const trimmed = question.trim();
    if (!trimmed) {
        return null;
    }

    if (history.length >= 2 && FOLLOW_UP_QUERY.test(trimmed)) {
        return [];
    }

    if (OVERVIEW_QUERY.test(trimmed)) {
        const overviewFiles = pickMatchingFiles(fileTree, COMMON_OVERVIEW_FILES);
        if (overviewFiles.length > 0) {
            return overviewFiles;
        }
    }

    return null;
}
