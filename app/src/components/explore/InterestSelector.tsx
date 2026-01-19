"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface InterestSelectorProps {
    onComplete: () => void;
    initialCategories?: string[];
    initialSubcategories?: string[];
}

const INTEREST_TREE = {
    tech: {
        label: 'Technology & AI',
        subcategories: [
            { id: 'tech.ai_ethics', label: 'AI Ethics & Regulation' },
            { id: 'tech.generative_models', label: 'Generative AI' },
            { id: 'tech.startups', label: 'Startups & VC' },
            { id: 'tech.hardware', label: 'Hardware & Compute' },
        ],
    },
    culture: {
        label: 'Culture & Society',
        subcategories: [
            { id: 'culture.media', label: 'Media & Entertainment' },
            { id: 'culture.trends', label: 'Social Trends' },
            { id: 'culture.philosophy', label: 'Philosophy & Ideas' },
        ],
    },
    business: {
        label: 'Business & Strategy',
        subcategories: [
            { id: 'business.leadership', label: 'Leadership' },
            { id: 'business.marketing', label: 'Marketing' },
            { id: 'business.growth', label: 'Growth & Scale' },
        ],
    },
    personal: {
        label: 'Personal Development',
        subcategories: [
            { id: 'personal.productivity', label: 'Productivity' },
            { id: 'personal.mindset', label: 'Mindset' },
            { id: 'personal.career', label: 'Career' },
        ],
    },
};

export function InterestSelector({ onComplete, initialCategories = [], initialSubcategories = [] }: InterestSelectorProps) {
    const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
    const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(initialSubcategories);
    const [saving, setSaving] = useState(false);

    const toggleCategory = (catId: string) => {
        setSelectedCategories(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    const toggleSubcategory = (subId: string) => {
        setSelectedSubcategories(prev =>
            prev.includes(subId) ? prev.filter(s => s !== subId) : [...prev, subId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/explore/interests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categories: selectedCategories,
                    subcategories: selectedSubcategories,
                }),
            });
            onComplete();
        } catch (err) {
            console.error('Failed to save interests:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-serif text-gray-900 mb-2">Focus Your Exploration</h1>
            <p className="text-gray-500 mb-8">
                Select the domains you're thinking about. We'll curate a feed that matches your worldview.
            </p>

            {/* Categories */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {Object.entries(INTEREST_TREE).map(([catId, cat]) => (
                    <button
                        key={catId}
                        onClick={() => toggleCategory(catId)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${selectedCategories.includes(catId)
                            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{cat.label}</span>
                            {selectedCategories.includes(catId) && (
                                <Check size={18} className="text-[var(--accent)]" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Subcategories (show for selected categories) */}
            {selectedCategories.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                        Narrow Your Focus
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {selectedCategories.flatMap(catId => {
                            const cat = INTEREST_TREE[catId as keyof typeof INTEREST_TREE];
                            return cat.subcategories.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => toggleSubcategory(sub.id)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${selectedSubcategories.includes(sub.id)
                                        ? 'bg-[var(--accent)] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {sub.label}
                                </button>
                            ));
                        })}
                    </div>
                </div>
            )}

            {/* CTA */}
            <button
                onClick={handleSave}
                disabled={saving || selectedCategories.length === 0}
                className="w-full py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {saving ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                    </>
                ) : (
                    'Start Exploring'
                )}
            </button>
        </div>
    );
}
