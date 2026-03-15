import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/services/blog-service";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Share2 } from "lucide-react";
import Footer from "@/components/Footer";
import { EnhancedMarkdown } from "@/components/EnhancedMarkdown";
import { BlogPost } from "@prisma/client";
import { Metadata } from "next";

// Generates static params for all blog posts
export async function generateStaticParams() {
  const posts: BlogPost[] = await getPublishedPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = `/blog/${post.slug}`;
  const publishedTime = (post.publishedAt ?? post.createdAt).toISOString();

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords ?? undefined,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: canonicalPath,
      images: [
        {
          url: post.image,
          alt: post.title,
        },
      ],
      publishedTime,
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900">
       {/* Header / Nav */}
       <div className="border-b-2 border-black bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-display font-bold tracking-tight text-foreground hover:text-amber-600 transition-colors">
            GitPulse
          </Link>
          <div className="flex gap-6 items-center">
            <Link href="/" className="text-sm text-foreground-muted hover:text-foreground transition-colors">Analyzer</Link>
            <Link href="/blog" className="text-sm font-medium text-foreground">Insights</Link>
            <Link href="#" target="_blank" className="text-sm text-foreground-muted hover:text-foreground transition-colors">GitHub</Link>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link 
          href="/blog" 
          className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors mb-12 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to Insights
        </Link>

        {/* Post Metadata */}
        <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 uppercase tracking-widest">
                    {post.category}
                </span>
                <span className="text-foreground-muted text-xs flex items-center gap-1">
                    <Clock size={12} /> 5 min read
                </span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl mb-8 tracking-tight leading-tight text-foreground">
                {post.title}
            </h1>
            <div className="flex items-center justify-between py-6 border-y-2 border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F9C79A] border-2 border-black flex items-center justify-center font-bold text-gray-900">
                        GP
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">{post.author}</p>
                        <p className="text-xs text-foreground-muted">{post.date}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="p-2 rounded-lg bg-gray-100 border-2 border-gray-200 hover:bg-gray-200 transition-colors">
                        <Share2 size={18} className="text-foreground-muted" />
                    </button>
                </div>
            </div>
        </div>

        {/* Hero Image */}
        <div className="relative aspect-video rounded-3xl overflow-hidden mb-16 border-2 border-gray-200 shadow-xl">
            <Image 
                src={post.image} 
                alt={post.title}
                fill
                className="object-cover"
                priority
            />
        </div>

        {/* Post Content */}
        <div className="prose prose-gray max-w-none prose-headings:text-foreground prose-p:text-foreground-muted prose-a:text-amber-700 prose-strong:text-foreground">
            <EnhancedMarkdown content={post.content} />
        </div>

        {/* CTA */}
        <div className="mt-20 pt-12 border-t-2 border-gray-200 text-center">
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700 mb-8">Ready to see it in action?</h4>
            <Link 
                href="/" 
                className="inline-block bg-[#F9C79A] text-gray-900 font-bold border-2 border-black px-8 py-4 rounded-2xl hover:bg-amber-400 transition-colors shadow-[4px_4px_0px_rgba(0,0,0,1)]"
            >
                Start Analyzing Repos Now
            </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
