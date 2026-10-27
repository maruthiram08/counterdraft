// Counterdraft Type Definitions

// ===========================================
// CORE ENTITIES
// ===========================================

export type BeliefType = 'core' | 'overused' | 'emerging' | 'rejected' | 'root' | 'pillar' | 'leaf';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  tier: 'free' | 'pro' | 'business';
  subscription_status?: 'active' | 'inactive' | 'past_due';
  subscription_plan?: string;
  subscription_id?: string;
  createdAt: Date;
  lastLogin: Date;
}
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

  // Genealogy Fields (V1 Upgrade)
  parentId?: string | null;
  rootId?: string | null;
  tags?: string[];
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
  coreBeliefs: { statement: string; reasoning: string; confidence: string; context?: string; tags?: string[] }[];
  overusedAngles: { statement: string; reasoning: string; confidence: string; context?: string; tags?: string[] }[];
  emergingThesis: { statement: string; reasoning: string; confidence: string; context?: string; tags?: string[] }[];
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

// Brain: Post formats
export type PostFormat = 'thought_leadership' | 'personal_story' | 'tactical_guide' | 'listicle';

// Brain: Development wizard step tracking
export type DevStep =
  | 'deep_dive_in_progress'
  | 'deep_dive_complete'
  | 'outline_in_progress'
  | 'outline_review'
  | 'outline_complete'
  | 'draft_in_progress'
  | 'complete'
  | null; // null = wizard not started

// Brain: Audience targeting
export interface Audience {
  role: string;
  pain: string;
  beliefs?: string; // What they already believe about the topic
}

// Brain: Metadata structure (stored in content_items.brain_metadata)
// Preset values stay as suggestions; users can describe anything in their own words
// The Explore search, sources and idea a pipeline item started from
export interface ExploreOrigin {
  query: string; // What the writer typed
  label?: string; // Short name for the search
  from?: 'explore' | 'captures'; // Captures: ideas found from Lens captures in Your Mind
  intent?: 'learn' | 'news'; // Know-how search or news search
  platform?: string;
  tone?: string;
  sources: Array<{
    title: string;
    url: string;
    source?: string; // Outlet or site
    summary?: string; // Snippet from the search result
    takeaway?: string; // What a writer can use from it
    kind?: string; // framework, case study, expert view, data or news
    keyPoints?: string[]; // Facts and examples from reading the full piece (deep dive)
    // Set when the source is one of the writer's Lens captures rather than an Explore result
    captureId?: string;
    captureKind?: CaptureKind;
    intent?: CaptureIntent; // What the writer thinks of it
    note?: string; // The writer's own note on the capture
    text?: string; // The captured words, as saved
  }>;
  // Absent when a topic was saved before any post idea was picked for it
  idea?: { hook: string; angle: string; format: string; belief?: string };
  savedAs?: 'idea' | 'topic';
  note?: string; // The writer's own note on a saved topic
}

export interface BrainMetadata {
  outcome: Outcome | (string & {});
  audience?: Audience;
  stance?: Stance | (string & {});
  format?: PostFormat | (string & {});
  confidence: ConfidenceLevel;
  brief?: string; // The user's own description of the post, passed verbatim to generation
  cta?: string; // What the reader should do next
  include?: string[]; // Facts, names or points that must appear
  avoid?: string[]; // Words, topics or habits to stay away from
  toneNotes?: string; // Tone in the user's own words
  length?: string; // Length or platform preference
  clarifyingQuestion?: string; // One open question from the brief parser, if something important is unclear
  researchedWith?: string; // Strategy snapshot the current research was generated from
  outlinedWith?: string; // Strategy snapshot the current outline was generated from
  draftedWith?: string; // Strategy snapshot the current draft was generated from
  draftNotes?: { question: string; answer: string }[]; // The creator's answers before drafting and notes added since; every draft and rewrite uses them
  draftSuggestions?: string[]; // Passages the draft wrote where it needed a detail nobody gave, for the creator to check
  source?: {
    type: 'belief' | 'tension' | 'idea' | 'manual' | 'artifact' | 'synthesis';
    id?: string;
  };
  tags?: string[];
  entities?: string[];
  sourceContext?: string; // Content from source
  explore?: ExploreOrigin; // Where an idea saved from Explore came from, so later steps stay on that topic
  inferred?: {
    outcome?: boolean;
    stance?: boolean;
  };
  references?: ContentReference[]; // V1: Store references directly in metadata
  repurpose?: {
    platform: string;
    generatedAssets: unknown[];
    parentId?: string;
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
  rootBeliefId?: string | null;
  parentBeliefId?: string | null;
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

// Brain: Logging & Tracing
export type BrainAction =
  | 'belief_extraction'
  | 'tension_analysis'
  | 'idea_generation'
  | 'deep_dive'
  | 'outline_generation'
  | 'draft_generation'
  | 'content_refinement'
  | 'outcome_inference'
  | 'confidence_calculation'
  | 'bootstrap_genealogy';

export type CaptureKind = 'bookmark' | 'snip' | 'frame';
// 'framing' is only on captures saved before Style replaced it
export type CaptureIntent = 'agree' | 'counter' | 'evidence' | 'example' | 'style' | 'framing';

export interface Artifact {
  id: string;
  userId: string;
  source_url?: string;
  source_domain?: string;
  source_title?: string;
  ocr_text?: string;
  user_note?: string;
  intent_type?: CaptureIntent | null;
  image_path?: string;
  imageUrl?: string; // Public URL of the stored snip or frame image
  ai_metadata?: {
    visual_summary?: string;
    intent?: CaptureIntent; // Kept here while the database's intent_type check doesn't allow 'style' yet
    kind?: CaptureKind;
    type?: string;
    tags?: string[];
    entities?: string[];
    summary?: string;
    key_insight?: string;
  };
  usedIn?: number; // Pipeline items built from this capture
  createdAt: Date;
  created_at?: string | Date; // Support DB raw shape
}

export interface BrainTraceLog {
  id: string;
  contentItemId?: string;
  action: BrainAction;
  inputContext: unknown; // Flexible JSON
  outputResult: unknown; // Flexible JSON
  toolCalls?: unknown; // Flexible JSON for tool usage
  modelConfig: {
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  latencyMs: number;
  tokensUsed?: number;
  createdAt: Date;
}

export interface ConfidenceResult {
  level: ConfidenceLevel; // 'low' | 'medium' | 'high'
  score: number; // 0-100
  reasoning: string;
  conflictingBeliefIds?: string[];
}


// ===========================================
// BRAIN GENERATION TYPES
// ===========================================

export type ResearchItem = string | { text: string; notes?: string[] };
export type InsightItem = string | { text: string; notes?: string[] };
export type OutlineItem = string | { text: string; notes?: string[] };

export interface DeepDiveData {
  research: ResearchItem[];
  insights: InsightItem[];
}

export interface InstagramSlide {
  header: string;
  body: string;
  visualDescription: string;
}

export interface RepurposeOptions {
  length?: 'short' | 'medium' | 'long'; // For Medium
  format?: 'single' | 'carousel';      // For Instagram
  generateCover?: boolean;
  generateInfographic?: boolean;
}

export interface RepurposedExtraData {
  slides?: InstagramSlide[];
  hashtags?: string[] | string;
  caption?: string;
}

export interface RepurposedContent {
  title: string;
  content: string;
  extraData?: RepurposedExtraData;
}

export interface Draft {
  id: string;
  belief_text: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  platform?: string;
  platform_metadata?: Record<string, unknown>;
  published_posts?: {
    id: string;
    platform: string;
    platform_post_id: string;
    published_at: string;
    url?: string;
  }[];
  labels?: {
    platform?: string;
    length?: string;
    parentId?: string;
  };
  brain_metadata?: BrainMetadata;
}
