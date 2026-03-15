"use client";

import { useState } from "react";
import { File, Folder, FolderOpen, GitBranch, ChevronRight, ChevronDown, X, AlertCircle, Star, GitFork, CircleDot, Calendar } from "lucide-react";
import { FileNode, GitHubRepo } from "@/lib/github";
import { cn } from "@/lib/utils";
import CodeIcon from "@/components/CodeIcon";

interface RepoSidebarProps {
    fileTree: FileNode[];
    repoName: string;
    isOpen: boolean;
    onClose: () => void;
    onFileDoubleClick?: (filePath: string) => void;
    hiddenFiles?: { path: string; reason: string }[];
    repoData?: GitHubRepo;
}

type TreeNode = {
    name: string;
    path: string;
    type: "blob" | "tree";
    children?: TreeNode[];
};

function buildTree(files: FileNode[]): TreeNode[] {
    const root: TreeNode[] = [];

    files.forEach((file) => {
        const parts = file.path.split("/");
        let currentLevel = root;
        let currentPath = "";

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            // Check if we already have this node at this level
            let existingNode = currentLevel.find((node) => node.name === part);

            if (!existingNode) {
                const isFile = index === parts.length - 1 && file.type === "blob";
                const newNode: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: isFile ? "blob" : "tree",
                    children: isFile ? undefined : [],
                };

                currentLevel.push(newNode);
                existingNode = newNode;
            }

            if (existingNode.children) {
                currentLevel = existingNode.children;
            }
        });
    });

    // Sort: Folders first, then files
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "tree" ? -1 : 1;
        });
        nodes.forEach((node) => {
            if (node.children) sortNodes(node.children);
        });
    };

    sortNodes(root);
    return root;
}

function FileTreeNode({
    node,
    depth,
    onFileDoubleClick
}: {
    node: TreeNode;
    depth: number;
    onFileDoubleClick?: (filePath: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const isFolder = node.type === "tree";

    const handleClick = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else if (onFileDoubleClick) {
            onFileDoubleClick(node.path);
        }
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer select-none transition-colors",
                    depth > 0 && "ml-3"
                )}
                onClick={handleClick}
            >
                {isFolder && (
                    <span className="text-gray-500">
                        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                )}

                {isFolder ? (
                    isOpen ? (
                        <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                        <Folder className="w-4 h-4 text-amber-600 shrink-0" />
                    )
                ) : (
                    <File className="w-4 h-4 text-gray-500 shrink-0" />
                )}

                <span className="truncate">{node.name}</span>
            </div>

            {isOpen && node.children && (
                <div className="border-l border-gray-200 ml-2.5">
                    {node.children.map((child) => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            onFileDoubleClick={onFileDoubleClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function RepoSidebar({ fileTree, repoName, isOpen, onClose, onFileDoubleClick, hiddenFiles = [], repoData }: RepoSidebarProps) {
    const tree = buildTree(fileTree);
    const [showHiddenFiles, setShowHiddenFiles] = useState(false);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "w-64 max-w-[80vw] md:max-w-none border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden transition-transform duration-300 ease-in-out",
                // Mobile: fixed and slide in/out
                "md:relative md:translate-x-0",
                "fixed z-50",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-gray-200 bg-[#FEF9F2] flex flex-col gap-3">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm overflow-hidden">
                            <GitBranch className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="truncate" title={repoName}>{repoName}</span>
                        </h2>
                        {/* Close button for mobile */}
                        <button
                            onClick={onClose}
                            className="md:hidden p-1 hover:bg-gray-200 rounded transition-colors shrink-0"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    {repoData && (
                        <div className="space-y-3">
                            {repoData.description && (
                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                    {repoData.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <div className="flex items-center gap-1" title="Stars">
                                    <Star className="w-3 h-3 text-amber-500" />
                                    <span>{repoData.stargazers_count}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Forks">
                                    <GitFork className="w-3 h-3 text-gray-600" />
                                    <span>{repoData.forks_count}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Open Issues">
                                    <CircleDot className="w-3 h-3 text-gray-600" />
                                    <span>{repoData.open_issues_count}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>UPDATED {new Date(repoData.updated_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-2">
                    {tree.map((node) => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            depth={0}
                            onFileDoubleClick={onFileDoubleClick}
                        />
                    ))}
                </div>

                {hiddenFiles.length > 0 && (
                    <div className="shrink-0 p-3 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={() => setShowHiddenFiles(true)}
                            className="w-full flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded"
                        >
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span>{hiddenFiles.length} system files hidden</span>
                        </button>
                    </div>
                )}

                <div className="shrink-0 p-3 border-t border-gray-200 flex items-center justify-center gap-2 bg-[#FEF9F2]">
                    <CodeIcon className="w-8 h-8" />
                    <span className="text-xs font-semibold text-gray-600">GitPulse</span>
                </div>
            </div>

            {/* Hidden Files Modal */}
            {showHiddenFiles && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#FEF9F2]">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Hidden Files
                            </h3>
                            <button
                                onClick={() => setShowHiddenFiles(false)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <p className="text-sm text-gray-600 mb-4">
                                The following files and directories are hidden from the file tree to reduce noise and improve performance.
                            </p>
                            {hiddenFiles.map((file, i) => (
                                <div key={i} className="flex items-start justify-between gap-4 p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                                    <span className="font-mono text-gray-800 break-all">{file.path}</span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{file.reason}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowHiddenFiles(false)}
                                className="w-full py-2 bg-[#F9C79A] hover:bg-amber-400 text-gray-900 font-medium border-2 border-black rounded-lg transition-colors text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
