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
            case 'high': return <ShieldCheck className="text-green-600" size={32} />;
            case 'medium': return <Shield className="text-yellow-600" size={32} />;
            case 'low': return <ShieldAlert className="text-red-600" size={32} />;
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
            case 'high': return "bg-green-50 border-green-200 text-green-900";
            case 'medium': return "bg-yellow-50 border-yellow-200 text-yellow-900";
            case 'low': return "bg-red-50 border-red-200 text-red-900";
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Why this score?</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex flex-col items-center mb-6">
                        <div className={`p-4 rounded-full mb-3 ${confidence.level === 'high' ? 'bg-green-100' : confidence.level === 'medium' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                            {getIcon()}
                        </div>
                        <h4 className="text-xl font-bold">{getTitle()}</h4>
                        <div className="text-3xl font-black mt-1 text-gray-800">{confidence.score}/100</div>
                    </div>

                    <div className={`p-4 rounded-lg border mb-6 ${getColorClass()}`}>
                        <p className="text-sm font-medium leading-relaxed">
                            {confidence.reasoning}
                        </p>
                    </div>

                    {confidence.conflictingBeliefIds && confidence.conflictingBeliefIds.length > 0 && (
                        <div className="space-y-3">
                            <h5 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Related Beliefs</h5>
                            {/* In a real app we would resolve IDs to names here, or pass names in the analysis */}
                            <p className="text-sm text-gray-600 italic">
                                Alignment checks performed against {confidence.conflictingBeliefIds.length} beliefs.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
