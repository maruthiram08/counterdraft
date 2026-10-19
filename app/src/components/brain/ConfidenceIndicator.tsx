import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ConfidenceLevel } from '@/types';

interface ConfidenceIndicatorProps {
    level: ConfidenceLevel;
    loading?: boolean;
    onClick: () => void;
}

export function ConfidenceIndicator({ level, loading, onClick }: ConfidenceIndicatorProps) {
    if (loading) {
        return (
            <div className="animate-pulse w-6 h-6 rounded-full bg-canvas shadow-well" />
        );
    }

    const getColor = () => {
        switch (level) {
            case 'high': return 'text-sage-500 hover:text-sage-700 bg-sage-100';
            case 'medium': return 'text-sand-500 hover:text-sand-700 bg-sand-100';
            case 'low': return 'text-rose-500 hover:text-rose-700 bg-rose-100';
        }
    };

    const getIcon = () => {
        switch (level) {
            case 'high': return <ShieldCheck size={18} />;
            case 'medium': return <Shield size={18} />;
            case 'low': return <ShieldAlert size={18} />;
        }
    };

    return (
        <button
            onClick={onClick}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${getColor()} hover:shadow-raised active:shadow-pressed`}
            title="Click to see why"
        >
            {getIcon()}
        </button>
    );
}
