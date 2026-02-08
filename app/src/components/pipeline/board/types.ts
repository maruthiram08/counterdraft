
import { BrainMetadata, DevStep } from "@/types";
import { ResearchPoint } from "../wizard/types";

export type Stage = 'idea' | 'developing' | 'draft' | 'published';

export interface ContentItem {
    id: string;
    hook: string;
    angle?: string;
    format?: string;
    stage: Stage;
    dev_step?: DevStep;
    status: string;
    draft_content?: string;
    source_topics?: string[];
    created_at: string;
    updated_at: string;
    published_at?: string;
    platform?: string;
    brain_metadata?: BrainMetadata;
    deep_dive?: {
        research: (string | ResearchPoint)[];
        insights: (string | ResearchPoint)[];
    };
    outline?: {
        sections: (string | ResearchPoint)[];
    };
}
