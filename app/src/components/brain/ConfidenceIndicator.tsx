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
            <div className="animate-pulse w-6 h-6 rounded-full bg-gray-200" />
        );
    }

    const getColor = () => {
        switch (level) {
            case 'high': return 'text-green-500 hover:text-green-600 bg-green-50 hover:bg-green-100';
            case 'medium': return 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 hover:bg-yellow-100';
            case 'low': return 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100';
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
            className={`p-1.5 rounded-md transition-colors ${getColor()} border border-transparent hover:border-current`}
            title="Click to see why"
        >
            {getIcon()}
        </button>
    );
}
