import React, { useState } from 'react';
import { X, Send, Loader2, Linkedin, User, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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
                toast.error(data.error || "Failed to submit request.");
            }
        } catch (error) {
            console.error("Request access failed:", error);
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-canvas rounded-card shadow-float w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 pt-6 md:px-8 md:pt-8 pb-2 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Request Beta Access</h2>
                        <p className="text-sm text-ink-soft mt-1">We review requests manually every 24h.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:px-8 md:pb-8">
                    {success ? (
                        <div className="text-center py-8 space-y-4 animate-in fade-in">
                            <div className="w-16 h-16 bg-sage-100 text-sage-700 shadow-raised rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send size={28} />
                            </div>
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">Request Sent!</h3>
                            <p className="text-ink-soft leading-relaxed">
                                Thanks for your interest, {formData.name.split(' ')[0]}.<br />
                                We&apos;ll review your LinkedIn profile and email you an invite code if you&apos;re a good fit for this beta batch.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 w-full h-12 px-5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 active:shadow-pressed transition-all"
                            >
                                Got it
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-ink flex items-center gap-1.5">
                                    <User size={12} /> Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Your Full Name"
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-ink flex items-center gap-1.5">
                                    <Mail size={12} /> Work Email
                                </label>
                                <input
                                    required
                                    type="email"
                                    placeholder="you@company.com"
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {/* LinkedIn */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-ink flex items-center gap-1.5">
                                    <Linkedin size={12} /> LinkedIn Profile
                                </label>
                                <input
                                    required
                                    type="url"
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                                    value={formData.linkedin}
                                    onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                />
                            </div>

                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-ink flex items-center gap-1.5">
                                    <MessageSquare size={12} /> Why do you want access?
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="I write about X on LinkedIn and want to..."
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all text-sm resize-none"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {loading ? 'Submitting...' : 'Request Invite'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
