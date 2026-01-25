"use client";

import { useState } from "react";
import { X, Loader2, User, Briefcase, Mic } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function ProfileSetupModal({ isOpen, onClose, onComplete }: ProfileSetupModalProps) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState("");
    const [context, setContext] = useState("");
    const [voice, setVoice] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role,
                    context,
                    voice_tone: voice,
                }),
            });

            if (!res.ok) throw new Error("Failed");

            onComplete();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-zinc-100 rounded-full">
                    <X size={20} className="text-zinc-400" />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">Complete your Profile</h2>
                    <p className="text-zinc-500 text-sm">Help the Brain understand who you are for better suggestions.</p>
                </div>

                <div className="space-y-6">
                    {/* Role */}
                    <div>
                        <label className="text-sm font-bold text-zinc-900 mb-2 block flex items-center gap-2">
                            <User size={16} /> Role
                        </label>
                        <input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g. Founder, Creator, VC..."
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                        />
                    </div>

                    {/* Context */}
                    <div>
                        <label className="text-sm font-bold text-zinc-900 mb-2 block flex items-center gap-2">
                            <Briefcase size={16} /> What are you building?
                        </label>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="One line pitch..."
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all resize-none h-24"
                        />
                    </div>

                    {/* Voice */}
                    <div>
                        <label className="text-sm font-bold text-zinc-900 mb-2 block flex items-center gap-2">
                            <Mic size={16} /> Voice Tone
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Contrarian', 'Academic', 'Direct', 'Visionary'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setVoice(v)}
                                    className={`p-2 text-xs font-medium rounded-lg border transition-all ${voice === v ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 hover:border-zinc-400'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!role || !context || !voice || loading}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        Save Profile
                    </button>

                </div>
            </div>
        </div>
    );
}
