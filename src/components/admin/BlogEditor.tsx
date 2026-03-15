"use client";

import { useState } from "react";
import { BlogPost } from "@prisma/client";
import { EnhancedMarkdown } from "@/components/EnhancedMarkdown";
import { Save, Send, Eye, Edit3, ArrowLeft, Image as ImageIcon, Globe, Lock, Tag } from "lucide-react";
import Link from "next/link";
import { savePostAction } from "@/app/admin/blog/actions";
import { useRouter } from "next/navigation";

interface BlogEditorProps {
  initialPost?: Partial<BlogPost>;
}

export default function BlogEditor({ initialPost }: BlogEditorProps) {
  const router = useRouter();
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "Engineering",
    image: "/assets/landing_page.png",
    author: "GitPulse",
    published: false,
    keywords: "",
    ...initialPost
  });

  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleInsertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("content-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = post.content || "";

    const selectedText = currentContent.substring(start, end);
    const textBefore = currentContent.substring(0, start);
    const textAfter = currentContent.substring(end);

    const newContent = textBefore + prefix + selectedText + suffix + textAfter;
    setPost((prev) => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPost((prev: Partial<BlogPost>) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (published: boolean) => {
    setIsSaving(true);
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const dataToSave = { ...post, published };
      const result = await savePostAction(dataToSave);
      setPost(result);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      router.refresh();
      if (!post.id) {
          router.push(`/admin/blog/${result.id}`);
      }
    } catch (error) {
      console.error("Failed to save post:", error);
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save post. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadImage(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`/api/admin/blog/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const blob = await response.json();
      setPost(prev => ({ ...prev, image: blob.url }));
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold">
            {post.id ? "Edit Post" : "Create New Post"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 transition-all text-sm font-medium"
          >
            {isPreview ? <Edit3 size={16} /> : <Eye size={16} />}
            {isPreview ? "Edit Content" : "Preview"}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 transition-all text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 transition-all text-sm font-bold disabled:opacity-50"
          >
            <Send size={16} />
            Publish
          </button>
        </div>
      </div>

      {saveStatus === "success" && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Globe size={14} /> Post saved successfully!
        </div>
      )}

      {saveStatus === "error" && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm">
            {saveError || "Failed to save post. Please try again."}
        </div>
      )}

      {/* Main layout — sidebar is ALWAYS in column 3 so sticky works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left 2 cols: editor OR preview — always occupies same columns */}
        <div className="lg:col-span-2 space-y-4">

          {/* Editor */}
          {!isPreview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pl-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Content (Markdown)</label>
                {/* Toolbar */}
                <div className="flex items-center gap-1 text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-white/5 flex-wrap">
                  <button type="button" onClick={() => handleInsertMarkdown("# ")} className="hover:text-white transition-colors px-1 font-bold text-sm" title="Heading 1">H1</button>
                  <button type="button" onClick={() => handleInsertMarkdown("## ")} className="hover:text-white transition-colors px-1 font-bold text-sm" title="Heading 2">H2</button>
                  <button type="button" onClick={() => handleInsertMarkdown("### ")} className="hover:text-white transition-colors px-1 font-bold text-sm" title="Heading 3">H3</button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button type="button" onClick={() => handleInsertMarkdown("**", "**")} className="hover:text-white transition-colors px-1 font-bold text-sm" title="Bold">B</button>
                  <button type="button" onClick={() => handleInsertMarkdown("_", "_")} className="hover:text-white transition-colors px-1 italic font-serif text-sm" title="Italic">I</button>
                  <button type="button" onClick={() => handleInsertMarkdown("~~", "~~")} className="hover:text-white transition-colors px-1 line-through text-sm" title="Strikethrough">S</button>
                  <button type="button" onClick={() => handleInsertMarkdown("`", "`")} className="hover:text-white transition-colors px-1 font-mono text-sm" title="Inline Code">{"`c`"}</button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button type="button" onClick={() => handleInsertMarkdown("- ")} className="hover:text-white transition-colors px-1 text-sm" title="Bullet List">•</button>
                  <button type="button" onClick={() => handleInsertMarkdown("1. ")} className="hover:text-white transition-colors px-1 text-sm" title="Numbered List">1.</button>
                  <button type="button" onClick={() => handleInsertMarkdown("> ")} className="hover:text-white transition-colors px-1 text-sm" title="Blockquote">"</button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button type="button" onClick={() => handleInsertMarkdown("[", "](url)")} className="hover:text-white transition-colors px-1 text-sm" title="Link">🔗</button>
                  <button type="button" onClick={() => handleInsertMarkdown("![alt](", ")")} className="hover:text-white transition-colors text-sm" title="Image"><ImageIcon size={13} className="mx-1" /></button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button type="button" onClick={() => handleInsertMarkdown("```mermaid\n", "\n```")} className="hover:text-white transition-colors px-1 text-xs font-mono" title="Mermaid Flowchart">mermaid</button>
                  <button type="button" onClick={() => handleInsertMarkdown("```\n", "\n```")} className="hover:text-white transition-colors px-1 text-xs font-mono" title="Code Block">{"</>"}</button>
                </div>
              </div>
              <textarea
                id="content-textarea"
                name="content"
                value={post.content ?? ""}
                onChange={handleChange}
                placeholder="Write your brilliant content here..."
                className="w-full h-[600px] bg-zinc-900/50 border border-white/5 rounded-2xl p-6 text-zinc-300 outline-none focus:border-purple-500/30 transition-all font-mono text-sm leading-relaxed resize-none"
              />
            </div>
          )}

          {/* Preview */}
          {isPreview && (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 overflow-y-auto min-h-[600px]">
              <div className="max-w-none prose prose-invert">
                  <EnhancedMarkdown content={post.content || ""} />
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar — always col 3, sticky */}
        <div className="space-y-6 sticky top-8 self-start">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Title</label>
              <input
                type="text"
                name="title"
                value={post.title ?? ""}
                onChange={handleChange}
                placeholder="Post title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Slug</label>
              <input
                type="text"
                name="slug"
                value={post.slug ?? ""}
                onChange={handleChange}
                placeholder="post-slug-url"
                disabled={Boolean(post.id && (post.published || post.publishedAt))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50"
              />
              {Boolean(post.id && (post.published || post.publishedAt)) && (
                <p className="text-[11px] text-zinc-500">
                  Slug is locked after first publish to preserve canonical URLs.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Category</label>
              <select
                name="category"
                value={post.category ?? "Engineering"}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors appearance-none"
              >
                <option value="Engineering">Engineering</option>
                <option value="Security">Security</option>
                <option value="Product">Product</option>
                <option value="Announcement">Announcement</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Excerpt</label>
              <textarea
                name="excerpt"
                value={post.excerpt ?? ""}
                onChange={handleChange}
                placeholder="Short summary for SEO and index page"
                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            {/* SEO Keywords — admin-only, written to DB and used in <meta keywords> */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Tag size={12} />
                SEO Keywords
              </label>
              <input
                type="text"
                name="keywords"
                value={post.keywords ?? ""}
                onChange={handleChange}
                placeholder="repo analysis, github, open source (comma separated)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500/50 transition-colors"
              />
              <p className="text-[11px] text-zinc-600">
                Used in &lt;meta name=&quot;keywords&quot;&gt; — not visible to readers.
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <ImageIcon size={12} /> Cover Image
              </label>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative group cursor-pointer transition-all duration-300
                  aspect-video rounded-2xl border-2 border-dashed
                  flex flex-col items-center justify-center gap-3 overflow-hidden
                  ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}
                  ${isUploading ? 'opacity-50 cursor-wait' : ''}
                `}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {post.image ? (
                  <div className="absolute inset-0">
                    <img
                      src={post.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.src = "/assets/landing_page.png")}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        Change Image
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-xs font-bold text-zinc-300">Click or Drag Image</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Recommended 1200×630px</p>
                    </div>
                  </>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-purple-400">Uploading...</p>
                    </div>
                  </div>
                )}

                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Direct URL Input Fallback */}
              <div className="relative">
                <input
                  type="text"
                  name="image"
                  value={post.image ?? ""}
                  onChange={handleChange}
                  placeholder="Or paste direct image URL..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-purple-500/50 transition-colors pr-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 uppercase">
                  URL
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Status</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${post.published ? "text-green-400" : "text-yellow-400"}`}>
                    {post.published ? <Globe size={14} /> : <Lock size={14} />}
                    {post.published ? "Published" : "Draft"}
                </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
