"use client";

import { Compass } from "lucide-react";

interface DirectionCardProps {
    title: string;
    reason: string;
}

export function DirectionCard({ title, reason }: DirectionCardProps) {
    return (
        <div className="card hover:border-[var(--accent)] transition-colors group cursor-pointer">
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Compass size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold leading-tight mb-2 group-hover:text-[var(--accent)] transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        {reason}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-subtle)] font-medium">
                <span>Strengthens: "Quality over Quantity"</span>
            </div>
        </div>
    );
}
