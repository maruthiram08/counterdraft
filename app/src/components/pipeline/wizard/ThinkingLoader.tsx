
import { Loader2 } from "lucide-react";

interface ThinkingLoaderProps {
    message: string;
}

export function ThinkingLoader({ message }: ThinkingLoaderProps) {
    return (
        <div className="flex flex-col items-center py-12 text-gray-400 bg-white/50 rounded-lg border-2 border-dashed border-gray-100">
            <Loader2 size={32} className="animate-spin mb-4 text-[var(--accent)]" />
            <p className="animate-pulse">{message}</p>
        </div>
    );
}

