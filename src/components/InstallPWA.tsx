"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface IOSNavigator extends Navigator {
    MSStream?: unknown;
    standalone?: boolean;
}

function isIosDevice(): boolean {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as IOSNavigator;
    return /iPad|iPhone|iPod/.test(nav.userAgent) && !nav.MSStream;
}

function isInstalled(): boolean {
    if (typeof window === "undefined") return false;

    const nav = window.navigator as IOSNavigator;
    const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const displayModeFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
    const displayModeMinimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;
    const iosStandalone = nav.standalone === true;
    const androidTrustedWebApp = document.referrer.startsWith("android-app://");

    return displayModeStandalone || displayModeFullscreen || displayModeMinimalUi || iosStandalone || androidTrustedWebApp;
}

export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [installed, setInstalled] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setIsIOS(isIosDevice());
        setInstalled(isInstalled());

        const media = window.matchMedia("(display-mode: standalone)");
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        const handleAppInstalled = () => {
            setInstalled(true);
            setDeferredPrompt(null);
        };
        const handleDisplayModeChange = () => {
            setInstalled(isInstalled());
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);
        media.addEventListener("change", handleDisplayModeChange);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
            media.removeEventListener("change", handleDisplayModeChange);
        };
    }, []);

    useEffect(() => {
        const shouldShow = !installed && (Boolean(deferredPrompt) || isIOS);
        if (!shouldShow) {
            setVisible(false);
            return;
        }

        const timer = window.setTimeout(() => setVisible(true), 120);
        return () => window.clearTimeout(timer);
    }, [deferredPrompt, installed, isIOS]);

    const handleInstallClick = async () => {
        if (isIOS) {
            toast.info("To install on iOS: tap 'Share' then 'Add to Home Screen'", {
                duration: 5000,
                icon: <Download className="w-4 h-4" />
            });
            return;
        }

        if (!deferredPrompt) return;

        // Show the install prompt
        await deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
            console.log("User accepted the install prompt");
            setDeferredPrompt(null);
        } else {
            console.log("User dismissed the install prompt");
        }
    };

    if (installed || (!deferredPrompt && !isIOS)) return null;

    return (
        <button
            onClick={handleInstallClick}
            aria-label="Install app"
            title="Install app"
            className={`fixed bottom-6 right-6 z-50 md:hidden flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-500 ease-out active:scale-95 ${
                visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-90 opacity-0"
            }`}
        >
            <Download className="h-5 w-5 text-blue-300" />
        </button>
    );
}
