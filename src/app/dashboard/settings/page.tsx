import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings, User, Shield, Bell } from "lucide-react";
import Image from "next/image";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
import { buildInvalidSessionSignOutRedirect, getSessionAuthState } from "@/lib/session-guard";

export default async function SettingsPage() {
    const session = await auth();
    const authState = getSessionAuthState(session);

    if (authState === "unauthenticated") {
        redirect("/");
    }
    if (authState === "invalid") {
        redirect(buildInvalidSessionSignOutRedirect());
    }

    const user = session?.user;
    if (!user) {
        redirect("/");
    }

    return (
        <div className="relative min-h-[calc(100vh-10rem)]">
            <ComingSoonOverlay />

            <div className="space-y-8 opacity-40 grayscale-[0.5] pointer-events-none select-none">
                <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8 text-zinc-500" />
                    <h1 className="text-3xl font-bold">Settings</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        {/* Profile Section */}
                        <div className="rounded-3xl bg-zinc-900 border border-white/5 p-8 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/20 shadow-xl">
                                {user.image ? (
                                    <Image
                                        src={user.image}
                                        alt={user.name || "User"}
                                        width={96}
                                        height={96}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <User className="w-10 h-10 text-zinc-500" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left flex-1">
                                <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
                                <p className="text-zinc-500 mb-4">{user.email}</p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-medium">
                                        GitHub Connected
                                    </span>
                                    <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
                                        Pro Plan
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Placeholder Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer group">
                                <Shield className="w-6 h-6 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="font-semibold mb-2">Security</h3>
                                <p className="text-sm text-zinc-500">Manage your password and security settings.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer group">
                                <Bell className="w-6 h-6 text-orange-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="font-semibold mb-2">Notifications</h3>
                                <p className="text-sm text-zinc-500">Choose when and how you want to be alerted.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-600/20 p-6">
                            <h3 className="font-bold text-lg mb-2">Preferences</h3>
                            <p className="text-sm text-zinc-400 mb-6">Customize your GitPulse experience.</p>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-300">Dark Mode</span>
                                    <div className="w-10 h-5 bg-purple-600 rounded-full flex items-center px-1">
                                        <div className="w-3 h-3 bg-white rounded-full ml-auto" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between opacity-50">
                                    <span className="text-sm text-zinc-300">Email Updates</span>
                                    <div className="w-10 h-5 bg-zinc-700 rounded-full flex items-center px-1">
                                        <div className="w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
