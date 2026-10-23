import { supabaseAdmin } from "@/lib/supabase-admin";
import { openai } from "@/lib/openai";
import { addRules, cleanOrigins, dedupeRules, parseTidy, ruleKey, RuleOrigin, TidyProposal } from "./rules";

export interface VoiceProfile {
    id: string;
    user_id: string;
    name: string;
    voice_tone: string;
    rules: string[];
    anti_patterns: string[];
    workflow_preferences: {
        auto_ask_questions: boolean;
        interaction_model: 'interviewer' | 'ghostwriter' | 'devil_advocate';
        rule_origins?: Record<string, RuleOrigin>; // where each rule came from, keyed by the rule's text
    };
    is_active: boolean;
}

interface VoiceAnalysisResult {
    voice_tone: string;
    rules: string[];
    anti_patterns: string[];
    analysis_summary: string;
}

export class VoiceService {
    /**
     * Get the active voice profile for a user.
     * If none exists, creates a default one.
     */
    async getProfile(userId: string): Promise<VoiceProfile> {
        const { data, error } = await supabaseAdmin
            .from('voice_profiles')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) return data;

        // Fallback: Check if ANY profile exists, make the last created one active
        const { data: anyProfile } = await supabaseAdmin
            .from('voice_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (anyProfile) {
            await this.setActiveProfile(userId, anyProfile.id);
            return anyProfile;
        }

        // If absolutely no profile, create default
        return this.createDefaultProfile(userId);
    }

    /**
     * Get ALL voice profiles for a user
     */
    async getProfiles(userId: string): Promise<VoiceProfile[]> {
        const { data, error } = await supabaseAdmin
            .from('voice_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Set a specific profile as active (and others as inactive)
     */
    async setActiveProfile(userId: string, profileId: string) {
        // 1. Deactivate all
        await supabaseAdmin
            .from('voice_profiles')
            .update({ is_active: false })
            .eq('user_id', userId);

        // 2. Activate target
        const { data, error } = await supabaseAdmin
            .from('voice_profiles')
            .update({ is_active: true })
            .eq('id', profileId)
            .eq('user_id', userId) // Safety check
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create a new empty profile
     */
    async createProfile(userId: string, name: string): Promise<VoiceProfile> {
        // Deactivate others first? Or just create it as active? 
        // Let's create it as ACTIVE by default for immediate use.
        await supabaseAdmin
            .from('voice_profiles')
            .update({ is_active: false })
            .eq('user_id', userId);

        const { data, error } = await supabaseAdmin
            .from('voice_profiles')
            .insert({
                user_id: userId,
                name: name,
                voice_tone: 'Neutral', // Default
                rules: [],
                anti_patterns: [],
                is_active: true,
                workflow_preferences: {
                    auto_ask_questions: false,
                    interaction_model: 'ghostwriter'
                }
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create a default profile
     */
    private async createDefaultProfile(userId: string): Promise<VoiceProfile> {
        return this.createProfile(userId, 'Default Voice');
    }

    /**
     * Update the voice profile rules/preferences
     */
    async updateProfile(userId: string, updates: Partial<VoiceProfile>, profileId?: string) {
        let query = supabaseAdmin
            .from('voice_profiles')
            .update(updates)
            .eq('user_id', userId);

        if (profileId) {
            query = query.eq('id', profileId);
        } else {
            // Default to active if no ID provided
            query = query.eq('is_active', true);
        }

        const { data, error } = await query.select().single();

        if (error) throw error;
        return data;
    }

    /**
     * Analyze writing samples to extract voice patterns
     */
    async analyzeSamples(userId: string, samples: string[]): Promise<Partial<VoiceProfile>> {
        const combinedText = samples.join('\n\n---\n\n').substring(0, 15000); // Token limit safety

        const systemPrompt = `You are a linguistic analyst. 
        Analyze the provided writing samples to extract the author's unique "Voice Profile".
        
        Extract:
        1. **Tone**: 2-3 adjectives (e.g., Cynical, Direct, Warm).
        2. **Rules**: Specific stylistic choices (e.g., "Uses short sentences", "Starts with verbs").
        3. **Anti-Patterns**: What they avoid (e.g., "No jargon", "No emojis").
        
        Output JSON:
        {
            "voice_tone": "string",
            "rules": ["string"],
            "anti_patterns": ["string"],
            "analysis_summary": "string"
        }`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Samples:\n${combinedText}` }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}') as VoiceAnalysisResult;

        // Save the analysis (optional, or return to UI for confirmation)
        // For now, we just return it so the UI can populate the form
        return {
            voice_tone: result.voice_tone,
            rules: result.rules || [],
            anti_patterns: result.anti_patterns || []
        };
    };


    /**
     * Compare original vs final content to extract new stylistic rules
     */
    async learnFromEdits(userId: string, original: string, final: string): Promise<{
        learned: boolean;
        newRulesCount: number;
        newRules: string[];
        analysis: string;
    }> {
        if (!original || !final || original === final) {
            return { learned: false, newRulesCount: 0, newRules: [], analysis: "No significant changes." };
        }

        const systemPrompt = `You are a Ghostwriter's Editor.
        The user has edited a draft generated by AI. Your job is to understand WHY they made those changes and derive a new "Style Rule" for future drafts.

        INPUTS:
        - Original AI Draft
        - Final User Version

        TASK:
        1. Identify the *pattern* of changes (e.g., "User removed all adverbs", "User changed 'utilize' to 'use'", "User added personal anecdotes").
        2. Formulate 1-2 specific Style Rules to prevent this diff in the future.
        3. Ignore content additions (new facts); focus on STYLE (tone, structure, vocabulary).

        Output JSON:
        {
            "found_pattern": boolean,
            "analysis": "Brief explanation of changes",
            "new_rules": ["string"]
        }`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Original:\n${original.substring(0, 4000)}\n\nFinal:\n${final.substring(0, 4000)}` }
            ],
            model: "gpt-4o",
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

        if (result.found_pattern && result.new_rules && result.new_rules.length > 0) {
            // Update the profile
            const profile = await this.getProfile(userId);
            const currentRules = profile.rules || [];

            // Skip repeats (even ones worded slightly differently), then cap the list
            const uniqueNewRules = dedupeRules(result.new_rules.filter((r: unknown): r is string => typeof r === 'string'))
                .filter(r => !currentRules.some(c => ruleKey(c) === ruleKey(r)));

            if (uniqueNewRules.length > 0) {
                const origins = cleanOrigins(profile.workflow_preferences?.rule_origins);
                const at = new Date().toISOString();
                const why = typeof result.analysis === 'string' ? result.analysis.slice(0, 300) : undefined;
                for (const r of uniqueNewRules) origins[r] = { source: 'edit', at, ...(why ? { why } : {}) };
                const rules = addRules(currentRules, uniqueNewRules, origins);
                await this.updateProfile(userId, {
                    rules,
                    workflow_preferences: { ...profile.workflow_preferences, rule_origins: pickOrigins(origins, rules) },
                });

                return {
                    learned: true,
                    newRulesCount: uniqueNewRules.length,
                    newRules: uniqueNewRules,
                    analysis: result.analysis
                };
            }
        }

        return {
            learned: false,
            newRulesCount: 0,
            newRules: [],
            analysis: result.analysis || "No new rules derived."
        };
    }
    /**
     * Proposes a tidier rule set: near-duplicates merged, contradictions flagged. Nothing is saved;
     * the writer reviews it and saves it like any other edit.
     */
    async tidyRules(userId: string): Promise<TidyProposal> {
        const profile = await this.getProfile(userId);
        const original = { rules: profile.rules || [], anti_patterns: profile.anti_patterns || [] };

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You tidy a writer's voice profile: the rules ("do") and anti-patterns ("don't") an AI follows when it writes as them. The lists have grown one rule at a time, so some say the same thing in different words and some contradict each other.

1. Merge rules that say the same thing into one clear rule, in the writer's terms. Keep every distinct idea; never drop a rule because it seems unimportant.
2. Find pairs that contradict each other (including a rule and an anti-pattern), and say why in one line. Keep both in the lists; the writer decides.
3. Keep each rule short and specific.

Return JSON:
{
  "rules": ["..."],
  "anti_patterns": ["..."],
  "merged": [ { "into": "the merged rule", "from": ["original 1", "original 2"] } ],
  "conflicts": [ { "a": "one rule", "b": "the other", "why": "..." } ]
}`
                },
                { role: "user", content: `Rules:\n${original.rules.map(r => `- ${r}`).join('\n') || '(none)'}\n\nAnti-patterns:\n${original.anti_patterns.map(r => `- ${r}`).join('\n') || '(none)'}` }
            ],
        });

        let raw: unknown = {};
        try {
            raw = JSON.parse(completion.choices[0].message.content || '{}');
        } catch {
            raw = {};
        }
        return parseTidy(raw, original);
    }

    /**
     * Delete the active voice profile for a user.
     */
    async deleteProfile(userId: string) {
        const { error } = await supabaseAdmin
            .from('voice_profiles')
            .delete()
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;
        return true;
    }
}

// Origins only for rules still in the list, so the map doesn't outgrow it
function pickOrigins(origins: Record<string, RuleOrigin>, rules: string[]): Record<string, RuleOrigin> {
    return Object.fromEntries(rules.filter(r => origins[r]).map(r => [r, origins[r]]));
}

export const voiceService = new VoiceService();
