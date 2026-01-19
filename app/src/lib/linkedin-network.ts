
import { Agent, fetch as undiciFetch } from 'undici';

// Custom Undici Agent to override the default 10s connection timeout
// This is critical for networks with high packet loss/latency
const customAgent = new Agent({
    connect: {
        timeout: 120000, // 120 seconds connection timeout
        family: 4,       // Force IPv4 (Curl logs showed IPv6 failed/fallback)
    },
    bodyTimeout: 120000,
    headersTimeout: 120000,
});

/**
 * Fetch with retry logic customized for high-latency/packet-loss networks.
 * Uses custom Undici agent to enforce 120s connection timeout.
 * 
 * @param url The URL to fetch
 * @param options Fetch options (headers, method, body, etc.)
 * @param retries Number of retries (default: 5)
 * @param timeout Request timeout in ms (default: 120000)
 */
export const linkedinFetch = async (url: string, options: any, retries = 5, timeout = 120000) => {
    for (let i = 0; i < retries; i++) {
        try {
            // Use undiciFetch with custom dispatcher
            const res = await undiciFetch(url, {
                ...options,
                dispatcher: customAgent,
                signal: AbortSignal.timeout(timeout)
            });
            return res;
        } catch (err) {
            console.log(`[LinkedIn Network] Attempt ${i + 1}/${retries} failed:`, err);

            // Should we retry?
            if (i === retries - 1) throw err;

            console.log(`[LinkedIn Network] Retrying fetch (${i + 1}/${retries})...`);
            await new Promise(r => setTimeout(r, 500)); // Short 500ms backoff
        }
    }
    throw new Error('Retries failed');
};
