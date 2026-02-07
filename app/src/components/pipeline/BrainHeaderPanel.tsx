import { useState, useEffect } from "react";
import { BrainMetadata } from "@/types";
import { StrategyBar } from "@/components/editor/StrategyBar";

// Accept a generic item with either snake_case or camelCase brain metadata
interface BrainHeaderPanelProps {
    item: {
        id?: string;
        brain_metadata?: BrainMetadata;
        brainMetadata?: BrainMetadata;
        deepDive?: { research: string[]; insights?: string[] };
        deep_dive?: { research: string[]; insights?: string[] };
        hook?: string;
        title?: string;
    };
    onUpdate?: (metadata: BrainMetadata) => void;
}

export function BrainHeaderPanel({ item, onUpdate }: BrainHeaderPanelProps) {
    // derived metadata for stability
    const metadata = item.brain_metadata || item.brainMetadata || {};

    // Mock Draft object for StrategyBar compatibility
    const mockDraft: any = {
        id: item.id || 'temp',
        title: (item as any).hook || (item as any).title || 'Untitled',
        brain_metadata: metadata,
    };

    const handleUpdate = async (updates: any) => {
        if (onUpdate && updates.brain_metadata) {
            onUpdate(updates.brain_metadata);
        }
    };

    return (
        <div className="w-full">
            <StrategyBar
                draft={mockDraft}
                onUpdate={handleUpdate}
            />
        </div>
    );
}

