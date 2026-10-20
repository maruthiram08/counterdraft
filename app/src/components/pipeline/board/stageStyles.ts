import { Stage } from "./types";

// One colour per pipeline stage, shared by the summary card, column headers and mobile tabs.
export const STAGE_STYLES: Record<Stage, { label: string; dot: string; tick: string; rule: string }> = {
    idea: { label: 'Ideas', dot: 'bg-ember-500', tick: 'bg-ember-500', rule: 'border-ember-500' },
    developing: { label: 'In development', dot: 'bg-sand-500', tick: 'bg-sand-500', rule: 'border-sand-500' },
    draft: { label: 'Drafts', dot: 'bg-dusk-500', tick: 'bg-dusk-500', rule: 'border-dusk-500' },
    published: { label: 'Published', dot: 'bg-ink', tick: 'bg-ink', rule: 'border-ink' },
};
