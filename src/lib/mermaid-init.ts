import mermaid from "mermaid";

/**
 * Centralized Mermaid initialization
 * Light theme aligned with GitPulse app (cream background, black text, orange accent)
 */
export const initMermaid = () => {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'strict',
        suppressErrorRendering: true,
        themeVariables: {
            primaryColor: '#FCFAF5',
            primaryTextColor: '#000000',
            primaryBorderColor: '#1f2937',
            lineColor: '#6b7280',
            secondaryColor: '#F0EDE8',
            tertiaryColor: '#F0EDE8',
            background: '#FCFAF5',
            mainBkg: '#FFFFFF',
            secondBkg: '#F0EDE8',
            border1: '#d1d5db',
            border2: '#9ca3af',
            arrowheadColor: '#374151',
            fontFamily: '"Iosevka Charon Mono", "Iosevka", ui-monospace, monospace',
        }
    });
};
