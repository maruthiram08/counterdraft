// Counterdraft Type Definitions

// ===========================================
// CORE ENTITIES
// ===========================================

export type BeliefType = 'core' | 'overused' | 'emerging' | 'rejected';

export interface Belief {
  id: string;
  userId: string;
  statement: string;
  beliefType: BeliefType;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  userConfirmed: boolean;
  userEdited: boolean;
  originalStatement?: string;
  createdAt: Date;
  updatedAt: Date;
  evidence?: BeliefEvidence[];
}

export interface BeliefEvidence {
  id: string;
  beliefId: string;
  postId: string;
  relevanceScore: number;
  post?: RawPost;
}

export interface RawPost {
  id: string;
  userId: string;
  content: string;
  source: 'linkedin' | 'manual' | 'inspiration';
  isInspiration: boolean;
  inspirationAuthor?: string;
  postedAt?: Date;
  createdAt: Date;
}

export type TensionClassification = 
  | 'inconsistency' 
  | 'intentional_nuance' 
  | 'explore' 
  | 'pending';

export interface Tension {
  id: string;
  userId: string;
  beliefAId: string;
  beliefBId: string;
  tensionSummary: string;
  userClassification: TensionClassification;
  aiConfidence: number;
  createdAt: Date;
  updatedAt: Date;
  beliefA?: Belief;
  beliefB?: Belief;
}

export type IdeaStatus = 'suggested' | 'saved' | 'dismissed' | 'used';

export interface IdeaDirection {
  id: string;
  userId: string;
  theme: string;
  topic: string;
  strengthensBeliefId?: string;
  exploresTensionId?: string;
  risksWeakeningBeliefId?: string;
  openingLine?: string;
  rationale?: string;
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
  strengthensBelief?: Belief;
  exploresTension?: Tension;
  risksWeakeningBelief?: Belief;
}

// ===========================================
// API TYPES
// ===========================================

export interface IngestRequest {
  content: string;
  source?: 'linkedin' | 'manual' | 'inspiration';
  inspirationAuthor?: string;
}

export interface BeliefExtractionResult {
  coreBeliefs: string[];
  overusedAngles: string[];
  emergingThesis: string;
  detectedTensions: {
    beliefA: string;
    beliefB: string;
    summary: string;
  }[];
}

export interface IdeaGenerationResult {
  ideas: {
    theme: string;
    topic: string;
    strengthensBelief: string;
    exploresTension?: string;
    risksWeakening?: string;
    openingLine?: string;
    rationale: string;
  }[];
}

// ===========================================
// UI STATE
// ===========================================

export interface User {
  id: string;
  email: string;
  name?: string;
}

export type OnboardingStep = 
  | 'paste-posts' 
  | 'analyzing' 
  | 'confirm-beliefs' 
  | 'complete';
