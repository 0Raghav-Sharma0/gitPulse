import { ShieldCheck, Lock } from "lucide-react";

export default function SecurityBanner() {
    return (
        <section className="w-full py-16 relative z-10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-[#FEF9F2] border-2 border-black rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#F9C79A]/20 rounded-full blur-[80px]" />

                    <div className="flex gap-6 items-center flex-1 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-[#F9C79A] border-2 border-black flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-8 h-8 text-gray-900" />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Zero Data Retention. Period.</h3>
                            <p className="text-gray-700 text-sm leading-relaxed max-w-lg font-medium">
                                Your codebase is your intellectual property. Our models do not train on your private code. Scan findings are stored securely for your history, while code analysis remains private.
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 bg-white border-2 border-black rounded-xl px-5 py-3 flex items-center justify-center gap-2 relative z-10 m-auto md:m-0 w-full md:w-auto">
                        <Lock className="w-4 h-4 text-gray-700" />
                        <span className="text-sm font-semibold text-gray-900">SOC2 Ready</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
