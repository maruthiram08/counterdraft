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

// ===========================================
// MULTI-PLATFORM INTEGRATION
// ===========================================

export type Platform = 'linkedin' | 'notion' | 'google_docs';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: Platform;
  platformUserId?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
  profileName?: string;
  profilePicture?: string;
  connectedAt: Date;
  revoked: boolean;
}

export interface PublishedPost {
  id: string;
  userId: string;
  draftId: string;
  platform: Platform;
  platformPostId?: string;
  adaptedContent?: string;
  publishedAt: Date;
}

// Extended Belief with confidence model
export interface BeliefWithConfidence extends Belief {
  confidenceLevel: ConfidenceLevel;
  recencyWeight: number;
  isStable: boolean;
  evidenceCount: number;
}

// Extended RawPost with eligibility
export interface RawPostWithEligibility extends RawPost {
  isBeliefEligible: boolean;
  platformPostId?: string;
}

// ===========================================
// THE BRAIN (DECISION ENGINE)
// ===========================================

// Brain: Outcome types (what the post optimizes for)
export type Outcome = 'authority' | 'engagement' | 'conversion' | 'connection';

// Brain: Stance types (editorial posture)
export type Stance = 'supportive' | 'contrarian' | 'exploratory';

// Brain: Development wizard step tracking
export type DevStep =
  | 'deep_dive_in_progress'
  | 'deep_dive_complete'
  | 'outline_in_progress'
  | 'outline_complete'
  | 'draft_in_progress'
  | null; // null = wizard not started

// Brain: Audience targeting
export interface Audience {
  role: string;
  pain: string;
}

// Brain: Metadata structure (stored in content_items.brain_metadata)
export interface BrainMetadata {
  outcome: Outcome;
  audience?: Audience;
  stance?: Stance;
  confidence: ConfidenceLevel;
  source?: {
    type: 'belief' | 'tension' | 'idea' | 'manual';
    id?: string;
  };
  inferred?: {
    outcome?: boolean;
    stance?: boolean;
  };
}

// Brain: Content Item (Pipeline item)
export interface ContentItem {
  id: string;
  userId: string;
  hook: string; // The idea/topic
  stage: 'idea' | 'developing' | 'draft' | 'published';
  devStep?: DevStep | null;
  brainMetadata?: BrainMetadata;
  deepDive?: {
    research: string;
    analysis: string;
    sources?: string[];
  };
  outline?: {
    sections: {
      title: string;
      points: string[];
    }[];
  };
  draftContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Brain: Reference attachment
export type ReferenceType = 'text' | 'file' | 'link';

export interface ContentReference {
  id: string;
  contentItemId: string;
  referenceType: ReferenceType;
  title: string;
  content?: string;
  url?: string;
  filePath?: string;
  createdAt: Date;
}

