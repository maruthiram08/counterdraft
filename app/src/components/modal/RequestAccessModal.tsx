import React, { useState } from 'react';
import { X, Send, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from "@/components/shared/Loading";

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const field = "w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all";

export function RequestAccessModal({ isOpen, onClose }: RequestAccessModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        linkedin: '',
        reason: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/beta/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    linkedin_url: formData.linkedin,
                    reason: formData.reason
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
            } else {
                toast.error(data.error || "We couldn't send your request. Try again.");
            }
        } catch (error) {
            console.error("Request access failed:", error);
            toast.error("We couldn't send your request. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const firstName = formData.name.trim().split(' ')[0];

    return (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-access-title"
                className="relative w-full md:max-w-md md:mx-4 bg-surface rounded-t-card md:rounded-card shadow-float max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom duration-200"
            >
                <div className="flex items-start justify-between gap-3 px-5 pt-5 md:px-8 md:pt-7">
                    <div>
                        <h2 id="request-access-title" className="text-2xl font-medium tracking-[-0.02em] text-ink">
                            {success ? 'Request sent' : 'Ask for an invite'}
                        </h2>
                        {!success && (
                            <p className="text-sm text-ink-soft mt-1">
                                We read every request and email an invite link when there&apos;s a spot.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pt-5 md:px-8 pb-5 md:pb-8 safe-area-pb">
                    {success ? (
                        <div className="flex flex-col gap-5">
                            <div className="flex items-start gap-3 bg-sage-100 text-sage-700 rounded-tile p-4">
                                <Check size={20} className="shrink-0 mt-0.5" />
                                <p className="text-sm leading-relaxed">
                                    Thanks{firstName ? `, ${firstName}` : ''}. When we approve it, we&apos;ll email an invite link to <strong className="font-medium">{formData.email}</strong>.
                                </p>
                            </div>
                            <p className="text-sm text-ink-soft leading-relaxed">
                                Sign up with that same email and Pro is added to your account by itself, even if you never open the link.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full h-12 px-5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 active:shadow-pressed transition-all"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="ra-name" className="text-sm font-medium text-ink">Name</label>
                                <input id="ra-name" required type="text" autoComplete="name" placeholder="Your full name" className={field}
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="ra-email" className="text-sm font-medium text-ink">Email</label>
                                <input id="ra-email" required type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" className={field}
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                <p className="text-xs text-ink-muted">Use the email you&apos;ll sign up with.</p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="ra-linkedin" className="text-sm font-medium text-ink">LinkedIn profile</label>
                                <input id="ra-linkedin" required type="url" inputMode="url" placeholder="https://linkedin.com/in/…" className={field}
                                    value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="ra-reason" className="text-sm font-medium text-ink">What do you want to write about?</label>
                                <textarea id="ra-reason" required rows={3} placeholder="I post about… and want to…" className={`${field} resize-none`}
                                    value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-1 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? <Spinner size={18} /> : <Send size={18} />}
                                {loading ? 'Sending…' : 'Send request'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
