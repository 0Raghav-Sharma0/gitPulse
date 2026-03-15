interface RepoSuggestionsState {
    messagesCount: number;
    input: string;
    loading: boolean;
    scanning: boolean;
}

export function shouldShowRepoSuggestions(state: RepoSuggestionsState): boolean {
    if (state.messagesCount !== 1) return false;
    if (state.loading || state.scanning) return false;
    return state.input.trim().length === 0;
}
