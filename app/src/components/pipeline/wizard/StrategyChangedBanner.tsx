import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { RefreshCWIcon } from "@/components/icons/animated";

// Shown when the strategy was edited after a step was generated, so its output may not follow it
export function StrategyChangedBanner({ message, action, onClick }: { message: string; action: string; onClick: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 bg-ember-50 rounded-tile shadow-raised p-4 text-sm text-ember-700">
            <span>{message}</span>
            <button
                onClick={onClick}
                className="shrink-0 flex items-center gap-1.5 h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
            >
                <AnimatedIcon icon={RefreshCWIcon} size={14} /> {action}
            </button>
        </div>
    );
}
