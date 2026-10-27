
import { Loader2 } from "lucide-react";

interface ThinkingLoaderProps {
    message: string;
}

export function ThinkingLoader({ message }: ThinkingLoaderProps) {
    return (
        <div className="flex flex-col items-center px-6 py-8 md:py-12 text-center text-sm md:text-base text-ink-muted bg-canvas shadow-pressed rounded-card">
            <Loader2 size={28} className="animate-spin mb-3 md:mb-4 text-ember-500" />
            <p className="animate-pulse">{message}</p>
        </div>
    );
}

