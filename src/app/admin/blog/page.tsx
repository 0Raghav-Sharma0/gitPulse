import { getAllPosts } from "@/lib/services/blog-service";
import Link from "next/link";
import { PlusCircle, Edit3, Trash2, Eye, Calendar, User, Tag } from "lucide-react";

export default async function BlogAdminPage() {
  const posts = await getAllPosts();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Blog Posts</h1>
          <p className="text-zinc-400 text-sm">
            Manage your articles, drafts, and published content.
          </p>
        </div>
        <Link 
          href="/admin/blog/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold transition-all"
        >
          <PlusCircle size={18} />
          Create Post
        </Link>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {post.title}
                      </span>
                      <span className="text-xs text-zinc-500 mt-0.5">/{post.slug}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      post.published 
                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-400">{post.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-400">{post.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {post.published ? (
                        <Link 
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/5 rounded-lg transition-all"
                          title="View Live"
                        >
                          <Eye size={16} />
                        </Link>
                      ) : (
                        <span
                          className="p-1.5 text-zinc-700 rounded-lg cursor-not-allowed"
                          title="Drafts are not publicly visible"
                        >
                          <Eye size={16} />
                        </span>
                      )}
                      <Link 
                        href={`/admin/blog/${post.id}`}
                        className="p-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-400/5 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </Link>
                      <button 
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                    No posts found. Create your first post to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
