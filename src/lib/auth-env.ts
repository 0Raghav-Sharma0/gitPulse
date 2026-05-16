function readEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

export function getGitHubOAuthConfigError(): string | null {
    const clientId = readEnv("AUTH_GITHUB_ID") ?? readEnv("GITHUB_ID");
    const clientSecret =
        readEnv("AUTH_GITHUB_SECRET") ?? readEnv("GITHUB_SECRET");

    if (!clientId || !clientSecret) {
        return "Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET in .env.local from GitHub → Settings → Developer settings → OAuth Apps.";
    }

    if (/^\d+$/.test(clientId)) {
        return `AUTH_GITHUB_ID="${clientId}" is a numeric App ID, not an OAuth Client ID. Copy the "Client ID" string from your OAuth App (for example Ov23li… or Iv1.…).`;
    }

    return null;
}

export function getGitHubOAuthCredentials(): {
    clientId: string;
    clientSecret: string;
} {
    const configError = getGitHubOAuthConfigError();
    if (configError) {
        throw new Error(configError);
    }

    return {
        clientId: (readEnv("AUTH_GITHUB_ID") ?? readEnv("GITHUB_ID"))!,
        clientSecret: (readEnv("AUTH_GITHUB_SECRET") ??
            readEnv("GITHUB_SECRET"))!,
    };
}

export function getAuthSecret(): string | undefined {
    return readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
}
