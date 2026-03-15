import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Star, FileCode } from 'lucide-react';
import { getReposForTopic, isIndexableTopic } from '@/lib/repo-catalog';

interface Props {
    params: Promise<{
        topic: string;
    }>;
}

export const revalidate = 604800;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { topic } = await params;
    const topicSlug = decodeURIComponent(topic);
    const displayTopic = topicSlug.replace(/-/g, ' ');
    const capitalizedTopic = displayTopic.charAt(0).toUpperCase() + displayTopic.slice(1);
    const indexable = await isIndexableTopic(topicSlug);

    return {
        title: `Best Open Source ${capitalizedTopic} Repositories - GitPulse`,
        description: `Discover and analyze the top open-source GitHub repositories for ${displayTopic}. Deep architecture and code analysis powered by GitPulse.`,
        openGraph: {
            title: `Top ${capitalizedTopic} Repositories`,
            description: `Explore the best open-source projects using ${displayTopic}.`
        },
        alternates: {
            canonical: `/topics/${topic}`,
        },
        robots: indexable
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

export default async function TopicPage({ params }: Props) {
    const { topic } = await params;
    const decodedTopic = decodeURIComponent(topic);
    const displayTopic = decodedTopic.replace(/-/g, ' ');

    const repos = await getReposForTopic(decodedTopic);

    if (!repos || repos.length === 0) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-[#FDFCFB] text-gray-900 p-6 md:p-12 overflow-x-hidden relative">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[80vw] max-w-[500px] h-[80vw] max-h-[500px] bg-amber-200/40 rounded-full blur-[80px] md:blur-[128px]" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> back to home
                </Link>

                <header className="mb-16 border-b border-gray-200 pb-8 text-center md:text-left">
                    <h1 className="font-display text-3xl md:text-5xl tracking-tight mb-4 capitalize text-gray-900">
                        Best Open Source <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-700">{displayTopic}</span> Libraries
                    </h1>
                    <p className="text-xl text-gray-700 max-w-3xl">
                        A curated list of the most popular GitHub repositories tagged with <strong>{displayTopic}</strong>.
                        Select any project to visualize its architecture and dive into the codebase using GitPulse&apos;s AI engine.
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {repos.map((repo, index) => (
                        <Link
                            href={`/repo/${repo.owner}/${repo.repo}`}
                            key={`${repo.owner}/${repo.repo}`}
                            className="block w-full bg-[#FEF9F2] border-2 border-gray-200 hover:border-amber-400/60 rounded-xl p-6 transition-all group hover:bg-amber-50/50"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl md:text-2xl font-bold mb-2 flex flex-wrap items-center break-all text-gray-900">
                                        <span className="text-gray-500 mr-3 text-lg shrink-0">#{index + 1}</span>
                                        <span className="text-gray-600">{repo.owner}/</span>
                                        <span className="text-gray-900 group-hover:text-amber-700 transition-colors">{repo.repo}</span>
                                    </h2>
                                    <p className="text-gray-600 mb-4 line-clamp-2 md:pr-12">{repo.description}</p>

                                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                                        <span className="flex items-center text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                            <Star className="w-4 h-4 mr-1" />
                                            {repo.stars.toLocaleString()}
                                        </span>
                                        {repo.language && (
                                            <span className="flex items-center text-gray-600">
                                                <FileCode className="w-4 h-4 mr-1" />
                                                {repo.language}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="shrink-0 flex items-center text-amber-700 font-medium">
                                    Analyze Code <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
