import { Stage } from "./types";

// One colour per pipeline stage, shared by the summary card, column headers and mobile tabs.
export const STAGE_STYLES: Record<Stage, { label: string; dot: string }> = {
    idea: { label: 'Ideas', dot: 'bg-ember-500' },
    developing: { label: 'In development', dot: 'bg-sand-500' },
    draft: { label: 'Drafts', dot: 'bg-dusk-500' },
    published: { label: 'Posted', dot: 'bg-ink' },
};
