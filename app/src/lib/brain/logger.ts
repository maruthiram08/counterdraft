import { supabaseAdmin } from '@/lib/supabase-admin';
import type { BrainAction } from '@/types';

interface LogEntry {
    contentItemId?: string;
    action: BrainAction;
    inputContext: any;
    outputResult: any;
    toolCalls?: any;
    modelConfig: {
        model: string;
        temperature?: number;
        maxTokens?: number;
    };
    latencyMs: number;
    tokensUsed?: number;
}

/**
 * Logs AI decision traces to the database.
 * Fails silently to prevent blocking the main application flow.
 */
export async function logBrainAction(entry: LogEntry): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .from('brain_trace_logs')
            .insert({
                content_item_id: entry.contentItemId,
                action: entry.action,
                input_context: entry.inputContext,
                output_result: entry.outputResult,
                tool_calls: entry.toolCalls,
                model_config: entry.modelConfig,
                latency_ms: entry.latencyMs,
                tokens_used: entry.tokensUsed
            });

        if (error) {
            console.error('Failed to log brain action (Supabase Error):', error);
        }
    } catch (err) {
        console.error('Failed to log brain action (Unexpected Error):', err);
    }
}
