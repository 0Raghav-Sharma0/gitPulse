import { Metadata } from 'next';
import { headers } from 'next/headers';
import type { GitHubRepo, RepoCommit, RepoLanguage } from '@/lib/github';
import { getErrorStatus, getRepo, getRepoFullContext } from '@/lib/github';
import { cacheRepoUnavailable, getCachedRepoUnavailable } from '@/lib/cache';
import { isCuratedRepo } from '@/lib/repo-catalog';
import { ArrowLeft, Star, GitFork, AlertCircle, Clock, FileCode, Search, Lock, Home } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyBadge } from '@/components/CopyBadge';
import { normalizeReadmeForPreview } from './repo-page-utils';

interface Props {
    params: Promise<{
        owner: string;
        repo: string;
    }>;
}

export const revalidate = 900;

const REPO_SEGMENT_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function isLikelyCrawler(userAgent: string): boolean {
    return /bot|crawl|spider|slurp|preview|facebookexternalhit|linkedinbot|whatsapp|telegram|discord/i.test(userAgent);
}

function isValidRepoSegment(value: string): boolean {
    if (!REPO_SEGMENT_PATTERN.test(value)) {
        return false;
    }

    if (value.startsWith('.') || value.endsWith('.') || value.endsWith('.git')) {
        return false;
    }

    return true;
}

function isValidOwnerRepo(owner: string, repo: string): boolean {
    return isValidRepoSegment(owner) && isValidRepoSegment(repo);
}

function buildRepoSignInHref(owner: string, repo: string): string {
    const callbackUrl = encodeURIComponent(`/repo/${owner}/${repo}`);
    return `/api/auth/signin?callbackUrl=${callbackUrl}`;
}

function RepoUnavailableState({ owner, repo }: { owner: string; repo: string }) {
    return (
        <main className="min-h-screen bg-[#FDFCFB] text-gray-900 p-6 md:p-12 overflow-x-hidden relative">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] max-w-[500px] h-[80vw] max-h-[500px] bg-amber-200/40 rounded-full blur-[80px] md:blur-[128px]" />
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-10 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> back to home
                </Link>

                <section className="bg-[#FEF9F2] border-2 border-gray-200 rounded-2xl p-8 md:p-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold uppercase tracking-wide mb-5">
                        Repository unavailable
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">We couldn&apos;t access this repository</h1>
                    <p className="text-gray-700 leading-relaxed mb-6">
                        Repo path: <span className="font-semibold text-gray-900">{owner}/{repo}</span>
                    </p>
                    <p className="text-gray-600 leading-relaxed mb-8">
                        The repository may not exist, may be private, or the owner/repository name may be typed incorrectly.
                        Double-check the owner and repository name. To view private repositories, sign in with GitHub first.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            href={buildRepoSignInHref(owner, repo)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#F9C79A] text-gray-900 font-bold border-2 border-black hover:bg-amber-400 transition-colors"
                        >
                            <Lock className="w-4 h-4" />
                            Sign in with GitHub
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 transition-colors font-medium text-gray-900"
                        >
                            <Home className="w-4 h-4" />
                            Go to homepage
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { owner, repo } = await params;
    const valid = isValidOwnerRepo(owner, repo);
    const curated = valid ? await isCuratedRepo(owner, repo) : false;
    const knownUnavailable = valid ? await getCachedRepoUnavailable(owner, repo) : false;
    const shouldIndex = curated && !knownUnavailable;

    return {
        title: `${owner}/${repo} - GitPulse`,
        description: `Analyze ${owner}/${repo} architecture, code quality, and security with GitPulse Agentic CAG.`,
        openGraph: {
            title: `${owner}/${repo} - GitPulse Analysis`,
            description: `Deep AI analysis for ${owner}/${repo}.`,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${owner}/${repo} Architecture Analysis`,
            description: `Deep AI analysis for ${owner}/${repo}.`,
        },
        alternates: {
            canonical: `/repo/${owner}/${repo}`,
        },
        robots: shouldIndex
            ? { index: true, follow: true }
            : {
                index: false,
                follow: true,
                googleBot: {
                    index: false,
                    follow: true,
                },
            },
    };
}

export default async function RepoPage({ params }: Props) {
    const { owner, repo } = await params;

    if (!isValidOwnerRepo(owner, repo)) {
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    if (await getCachedRepoUnavailable(owner, repo)) {
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    let repoData: GitHubRepo;
    try {
        repoData = await getRepo(owner, repo);
    } catch (error) {
        if (getErrorStatus(error) === 404) {
            await cacheRepoUnavailable(owner, repo);
        }
        console.error('Failed repository existence check:', error);
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    const userAgent = (await headers()).get('user-agent') || '';
    const shouldRenderReadmePreview = !isLikelyCrawler(userAgent);

    let detailsData: { languages: RepoLanguage[]; commits: RepoCommit[] } = { languages: [], commits: [] };
    let readmeContent: string | null = null;

    try {
        const context = await getRepoFullContext(owner, repo);
        repoData = context.metadata;
        detailsData = { languages: context.languages, commits: context.commits };
        readmeContent = context.readme;
    } catch (error) {
        if (getErrorStatus(error) === 404) {
            await cacheRepoUnavailable(owner, repo);
        }
        console.error('Failed to load full repo context:', error);
        return <RepoUnavailableState owner={owner} repo={repo} />;
    }

    const fullReadme = normalizeReadmeForPreview(readmeContent);

    return (
        <main className="min-h-screen bg-[#FDFCFB] text-gray-900 p-6 md:p-12 overflow-x-hidden relative">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] max-w-[500px] h-[80vw] max-h-[500px] bg-amber-200/40 rounded-full blur-[80px] md:blur-[128px]" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> back to home
                </Link>

                <header className="mb-12 border-b border-gray-200 pb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="w-full">
                            <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4 text-gray-900">
                                <span className="text-gray-600">{owner} / </span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-700">{repoData.name}</span>
                            </h1>
                            {repoData.description && (
                                <p className="text-xl text-gray-700 max-w-2xl">{repoData.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 mt-8 text-sm text-gray-600">
                        <div className="flex items-center">
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                            {repoData.stargazers_count.toLocaleString()} stars
                        </div>
                        <div className="flex items-center">
                            <GitFork className="w-4 h-4 mr-2 text-blue-400" />
                            {repoData.forks_count.toLocaleString()} forks
                        </div>
                        <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 text-red-400" />
                            {repoData.open_issues_count.toLocaleString()} issues
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                            <FileCode className="w-4 h-4 mr-1 text-green-400" />
                            {detailsData.languages.slice(0, 3).map((lang) => (
                                <span key={lang.name} className="flex items-center mr-2">
                                    <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: lang.color ?? undefined }}></span>
                                    {lang.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-10">
                        <Link
                            href={`/chat?q=${owner}/${repo}`}
                            className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-black text-sm font-medium rounded-xl text-gray-900 bg-[#F9C79A] hover:bg-amber-400 transition-colors"
                        >
                            <FileCode className="w-4 h-4 mr-2" />
                            Chat with Codebase
                        </Link>
                        <Link
                            href={`/chat?q=${owner}/${repo}&prompt=architecture`}
                            className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium rounded-xl text-gray-900 transition-colors"
                        >
                            <GitFork className="w-4 h-4 mr-2" />
                            Architecture Scan
                        </Link>
                        <Link
                            href={`/chat?q=${owner}/${repo}&prompt=security`}
                            className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium rounded-xl text-gray-900 transition-colors"
                        >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Security Audit
                        </Link>
                        <Link
                            href={`/chat?q=${owner}/${repo}&prompt=explain`}
                            className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium rounded-xl text-gray-900 transition-colors"
                        >
                            <Search className="w-4 h-4 mr-2 text-gray-500" />
                            Explain Codebase
                        </Link>
                    </div>
                </header>

                <section className="bg-[#FEF9F2] border-2 border-gray-200 rounded-xl p-8 mb-12">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-900">
                        <Star className="w-5 h-5 mr-3 text-amber-600" />
                        AI Architecture Analysis
                    </h2>
                    <p className="text-gray-700 leading-relaxed mb-6">
                        This repository is indexed by GitPulse. By analyzing <strong>{owner}/{repo}</strong> in our AI interface,
                        you can instantly generate complete architecture diagrams, visualize control flows, and perform automated security audits across the entire codebase.
                    </p>
                    <p className="text-gray-600 mb-6">
                        Our Agentic Context Augmented Generation (Agentic CAG) engine loads full source files into context on-demand, avoiding the fragmentation of traditional RAG systems.
                        Ask questions about the architecture, dependencies, or specific features to see it in action.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-gray-100 w-fit px-3 py-1.5 rounded-lg border border-gray-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Source files are only loaded when you start an analysis to optimize performance.</span>
                    </div>
                    <div className="mt-8">
                        <Link
                            href={`/chat?q=${owner}/${repo}`}
                            className="text-amber-700 hover:text-amber-800 font-medium inline-flex items-center group"
                        >
                            Click here to launch the interactive analysis workspace
                            <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </section>

                <div className="mb-12">
                    <CopyBadge owner={owner} repo={repo} />
                </div>

                {shouldRenderReadmePreview && fullReadme && (
                    <section className="bg-[#FEF9F2] border-2 border-gray-200 rounded-xl p-8 mb-12">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-6">
                            <h2 className="text-xl font-medium text-gray-700 uppercase tracking-wider text-sm">Repository Summary (README)</h2>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Preview</span>
                        </div>

                        <div className="relative max-h-[400px] overflow-hidden">
                            <div className="prose prose-gray max-w-none prose-img:inline prose-img:m-0 prose-img:mr-1 prose-img:align-middle prose-p:leading-relaxed prose-a:text-amber-700 hover:prose-a:text-amber-800 prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl text-gray-800">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    skipHtml
                                >
                                    {fullReadme}
                                </ReactMarkdown>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FEF9F2] via-[#FEF9F2]/80 to-transparent pointer-events-none" />
                        </div>
                    </section>
                )}
            </div>
        </main >
    );
}
