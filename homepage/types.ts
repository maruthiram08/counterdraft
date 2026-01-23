
export interface ContentCard {
  id: string;
  title: string;
  status: 'idea' | 'developing' | 'draft' | 'published';
  author: string;
  updatedAt: string;
}

export enum WorkflowStage {
  IDEA = 'idea',
  DEVELOPING = 'developing',
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

export interface StrategyInput {
  audience: string;
  outcome: string;
  stance: string;
  format: string;
}
