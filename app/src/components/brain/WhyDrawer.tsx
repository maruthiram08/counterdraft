import { X, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { ConfidenceResult } from '@/types';

interface WhyDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    confidence: ConfidenceResult | null;
}

export function WhyDrawer({ isOpen, onClose, confidence }: WhyDrawerProps) {
    if (!isOpen || !confidence) return null;

    const getIcon = () => {
        switch (confidence.level) {
            case 'high': return <ShieldCheck className="text-sage-700" size={32} />;
            case 'medium': return <Shield className="text-sand-700" size={32} />;
            case 'low': return <ShieldAlert className="text-rose-700" size={32} />;
        }
    };

    const getTitle = () => {
        switch (confidence.level) {
            case 'high': return "High Confidence";
            case 'medium': return "Medium Confidence";
            case 'low': return "Low Confidence";
        }
    };

    const getColorClass = () => {
        switch (confidence.level) {
            case 'high': return "bg-sage-100 text-sage-700";
            case 'medium': return "bg-sand-100 text-sand-700";
            case 'low': return "bg-rose-100 text-rose-700";
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-ink/30 z-50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-80 bg-canvas shadow-float rounded-l-card z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
                <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">Why this score?</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex flex-col items-center mb-6 bg-surface rounded-tile shadow-card p-5">
                        <div className={`p-4 rounded-full mb-3 ${confidence.level === 'high' ? 'bg-sage-100' : confidence.level === 'medium' ? 'bg-sand-100' : 'bg-rose-100'}`}>
                            {getIcon()}
                        </div>
                        <h4 className="text-[17px] font-medium tracking-[-0.01em] text-ink">{getTitle()}</h4>
                        <div className="text-4xl font-medium tracking-[-0.03em] mt-1 text-ink">{confidence.score}/100</div>
                    </div>

                    <div className={`p-4 rounded-tile mb-6 ${getColorClass()}`}>
                        <p className="text-sm font-medium leading-relaxed">
                            {confidence.reasoning}
                        </p>
                    </div>

                    {confidence.conflictingBeliefIds && confidence.conflictingBeliefIds.length > 0 && (
                        <div className="space-y-3">
                            <h5 className="text-sm text-ink-muted">Related Beliefs</h5>
                            {/* In a real app we would resolve IDs to names here, or pass names in the analysis */}
                            <p className="text-sm text-ink-soft italic">
                                Alignment checks performed against {confidence.conflictingBeliefIds.length} beliefs.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
