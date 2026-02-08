
import { BrainMetadata, DevStep } from "@/types";

export interface ResearchPoint {
    text: string;
    notes: string[];
    isNew?: boolean;
}

export interface DeepDiveData {
    research: ResearchPoint[];
    insights: ResearchPoint[];
}

export interface ContentItem {
    id: string;
    hook: string;
    angle?: string;
    format?: string;
    deep_dive?: {
        research: (string | ResearchPoint)[];
        insights: (string | ResearchPoint)[];
    };
    outline?: {
        sections: (string | ResearchPoint)[];
    };
    brain_metadata?: BrainMetadata;
    dev_step?: DevStep;
    draft_content?: string;
}

export type WizardStep = 'deep_dive' | 'outline' | 'generate';
