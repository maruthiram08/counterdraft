import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'trace.log');

export const TraceLogger = {
    log: (category: string, message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        let payload = "";

        if (data) {
            try {
                // Formatting optimization: if data is a string, log as is. If object, prettify.
                payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            } catch (e) {
                payload = "[Unserializable Data]";
            }
        }

        const entry = `\n[${timestamp}] [${category.toUpperCase()}]\n${message}\n${payload ? payload + '\n' : ''}----------------------------------------`;

        try {
            // Append to file synchronously (only in development)
            if (process.env.NODE_ENV !== 'production') {
                fs.appendFileSync(LOG_FILE, entry);
            }
        } catch (e) {
            console.error("Failed to write to trace log", e);
        }
    }
};
