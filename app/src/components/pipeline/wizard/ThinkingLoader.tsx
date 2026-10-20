
import { Loader2 } from "lucide-react";

interface ThinkingLoaderProps {
    message: string;
}

export function ThinkingLoader({ message }: ThinkingLoaderProps) {
    return (
        <div className="flex flex-col items-center py-12 text-ink-muted bg-canvas shadow-pressed rounded-card">
            <Loader2 size={32} className="animate-spin mb-4 text-ember-500" />
            <p className="animate-pulse">{message}</p>
        </div>
    );
}

