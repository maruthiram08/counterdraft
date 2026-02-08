
import { openai } from '../openai';
import { BeliefExtractionResult } from '@/types';

// Helper for belief extraction
export async function extractBeliefs(posts: string[]): Promise<BeliefExtractionResult> {
  const content = posts.join('\n\n---\n\n');

  const systemPrompt = `You are an intellectual analyst helping creators understand their beliefs.
  Given a collection of posts from a creator, extract their underlying beliefs.
  
  Be opinionated but concise. Look for:
  - Strongly held positions that appear repeatedly
  - Angles they've overused (said too often)
  - Emerging new directions in their thinking
  - Contradictions or tensions between beliefs
  - Broad thematic tags for categorization
  
  Output as JSON matching this schema:
  {
    "coreBeliefs": [
      {
        "statement": "concise belief statement",
        "reasoning": "why this is a core belief",
        "confidence": "high/medium/low",
        "context": "direct quote or snippet",
        "tags": ["broad theme", "specific topic"]
      }
    ],
    "overusedAngles": [
      {
        "statement": "angle statement",
        "reasoning": "why this is overused",
        "confidence": "high/medium/low",
        "context": "direct quote or snippet",
        "tags": ["theme"]
      }
    ],
    "emergingThesis": {
        "statement": "thesis statement",
        "reasoning": "why this is emerging",
        "confidence": "low/medium/high",
        "context": "direct quote or snippet",
        "tags": ["theme"]
    },
    "detectedTensions": [
      {"beliefA": "string", "beliefB": "string", "summary": "why these conflict"}
    ]
  }`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze these posts and extract the creator's beliefs:\n\n${content}` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No response from OpenAI");

  const parsed = JSON.parse(result);

  // Normalize 'emergingThesis' to array for consistency if AI returns single object
  let emerging = [];
  if (parsed.emergingThesis) {
    emerging = Array.isArray(parsed.emergingThesis) ? parsed.emergingThesis : [parsed.emergingThesis];
  }

  return {
    coreBeliefs: parsed.coreBeliefs || [],
    overusedAngles: parsed.overusedAngles || [],
    emergingThesis: emerging,
    detectedTensions: parsed.detectedTensions || []
  };
}

// Helper for genealogy analysis
export async function analyzeGenealogyWithLLM(
  topic: string,
  rootBeliefs: { id: string; statement: string; type: string }[]
): Promise<{ rootId: string | null; reasoning: string }> {
  if (rootBeliefs.length === 0) {
    return { rootId: null, reasoning: "No root beliefs defined." };
  }

  const rootContext = rootBeliefs.map(b => `[${b.id}] ${b.statement}`).join('\n');

  const systemPrompt = `You are a strategic content analyst.
  Determine if the new "Topic" is a child node (derivative) of any existing "Root Belief".
  
  Genealogy Logic:
  - MATCH: The topic directly supports, expands upon, or is a specific instance of the Root Belief.
  - NONE: The topic is unrelated or contradicts the roots.
  
  Output as JSON: { "rootId": "uuid" | null, "reasoning": "brief explanation" }`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Root Beliefs:\n${rootContext}\n\nTopic: ${topic}\n\nFind parent.` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const result = completion.choices[0].message.content;
  if (!result) return { rootId: null, reasoning: "Error" };

  return JSON.parse(result);
}

// Helper for batch genealogy bootstrapping
export async function bootstrapGenealogyWithLLM(
  beliefs: { id: string; statement: string; type: string }[]
): Promise<{ roots: string[]; links: { childId: string; parentId: string }[] }> {
  if (beliefs.length === 0) return { roots: [], links: [] };

  const beliefContext = beliefs.map(b => `[${b.id}] ${b.statement}`).join('\n');

  const systemPrompt = `You are a strategic content analyst.
  Analyze a collection of beliefs and organize them into a hierarchy (Mental Map).
  
  TASK:
  1. Identify "Root" beliefs: These are the broadest, most foundational themes.
  2. Identify "Child" beliefs: These are specific instances, nuances, or pillared arguments that stem from a Root.
  3. Link children to their most logical parent.
  
  Output as JSON:
  {
    "roots": ["uuid1", "uuid2"],
    "links": [
      { "childId": "uuid3", "parentId": "uuid1" }
    ]
  }
  
  Note: Some beliefs may remain as roots if they don't logically fit under others.`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Beliefs:\n${beliefContext}\n\nOrganize them.` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const result = completion.choices[0].message.content;
  if (!result) return { roots: [], links: [] };

  return JSON.parse(result);
}

// Helper for confidence calculation
export async function analyzeConfidenceWithLLM(
  topic: string,
  beliefs: { id: string; statement: string; type: string }[]
): Promise<{ level: 'low' | 'medium' | 'high'; score: number; reasoning: string; conflictingBeliefIds: string[] }> {
  const beliefContext = beliefs.map(b => `[${b.id}] (${b.type}) ${b.statement}`).join('\n');

  const systemPrompt = `You are a coherence engine for a thought leader.
  Assess how well a new topic aligns with their existing beliefs.
  
  Confidence Logic:
  - HIGH (80-100): Strongly supported by Core beliefs without being redundant. "Safe" territory.
  - MEDIUM (50-79): Aligns with Emerging theories or neutral. 
  - LOW (0-49): Contradicts Core beliefs OR is an EXACT DUPLICATION of an Overused angle (the user is "coasting"). Also low if completely unrelated/random. 
  
  Output as JSON: 
  { 
    "level": "low|medium|high", 
    "score": number, 
    "reasoning": "concise explanation", 
    "conflictingBeliefIds": ["id1", "id2"] 
  }`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Existing Beliefs:\n${beliefContext}\n\nNew Topic: ${topic}\n\nAnalyze confidence.` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No response from OpenAI");

  return JSON.parse(result);
}
