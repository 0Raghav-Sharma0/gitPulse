import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getPublishedPosts } from "@/lib/services/blog-service";
import { ArrowRight, Calendar } from "lucide-react";
import Footer from "@/components/Footer";
import { BlogPost } from "@prisma/client";

export const metadata: Metadata = {
  title: "Insights - GitPulse Engineering & Security Blog",
  description: "Deep dives into Agentic CAG, AI-driven code analysis, and high-speed security scanning on GitHub.",
};

export default async function BlogIndex() {
  const posts: BlogPost[] = await getPublishedPosts();
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 selection:bg-amber-200/50">
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

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="mb-16">
          <h1 className="font-display text-5xl mb-4 tracking-tight text-foreground">
            Engineering <span className="bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="text-foreground-muted text-lg max-w-2xl">
            Exploring the intersection of Agentic AI, high-context code understanding, and developer productivity.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="py-24 text-center border-2 border-gray-200 rounded-3xl bg-[#FEF9F2]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-6 border-2 border-amber-300">
              <Calendar className="text-amber-600" size={32} />
            </div>
            <h2 className="font-display text-3xl mb-4 text-foreground">Insights Coming Soon</h2>
            <p className="text-foreground-muted max-w-md mx-auto italic">
              We're currently deep in the lab building the future of code intelligence. Check back soon for our first deep dives and engineering updates.
            </p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && (
              <div className="mb-16">
                <Link href={`/blog/${featuredPost.slug}`}>
                  <div className="conic-border-container rounded-3xl overflow-hidden group">
                    <div className="bg-[#FEF9F2] border-2 border-gray-200 p-1 md:p-2">
                      <div className="grid md:grid-cols-2 gap-8 items-center p-6 md:p-8">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-gray-200">
                          <Image 
                            src={featuredPost.image} 
                            alt={featuredPost.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                              {featuredPost.category}
                            </span>
                            <span className="text-foreground-muted text-xs flex items-center gap-1">
                              <Calendar size={12} /> {featuredPost.date}
                            </span>
                          </div>
                          <h2 className="font-display text-3xl mb-4 text-foreground group-hover:text-amber-700 transition-colors">
                            {featuredPost.title}
                          </h2>
                          <p className="text-foreground-muted mb-6 line-clamp-3 italic">
                            "{featuredPost.excerpt}"
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#F9C79A] border-2 border-black flex items-center justify-center text-[10px] font-bold text-gray-900">
                                GP
                              </div>
                              <span className="text-sm text-foreground-muted font-medium">{featuredPost.author}</span>
                            </div>
                            <span className="flex items-center gap-1 text-amber-700 text-sm font-bold group-hover:gap-2 transition-all">
                              Read Full Insight <ArrowRight size={16} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Grid Section */}
            <div className="grid md:grid-cols-2 gap-8">
              {regularPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <div className="bg-[#FEF9F2] border-2 border-gray-200 rounded-3xl p-6 hover:border-amber-300 hover:bg-amber-50/30 transition-all group h-full flex flex-col">
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-6 border-2 border-gray-200">
                      <Image 
                        src={post.image} 
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full bg-foreground text-white text-[10px] font-bold border-2 border-black uppercase tracking-widest">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-display text-xl mb-3 text-foreground group-hover:text-amber-700 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-foreground-muted text-sm mb-6 line-clamp-2 italic opacity-90">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto pt-4 border-t-2 border-gray-200 flex items-center justify-between">
                      <span className="text-foreground-muted text-[10px] font-bold uppercase tracking-tighter">
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 text-xs font-bold">
                        View <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
