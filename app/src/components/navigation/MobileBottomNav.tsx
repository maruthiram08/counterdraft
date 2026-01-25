"use client";

import { useState, useEffect } from "react";
import { Home, Compass, Book, Brain, MoreHorizontal, Zap, Network, Settings, X } from "lucide-react";

interface MobileBottomNavProps {
    activeSection: string;
    onNavigate: (section: string) => void;
}

export function MobileBottomNav({ activeSection, onNavigate }: MobileBottomNavProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Only show on mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isMobile) return null;

    const primaryNavItems = [
        { id: 'pipeline', label: 'Home', icon: Home },
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'drafts', label: 'Library', icon: Book },
        { id: 'beliefs', label: 'Mind', icon: Brain },
    ];

    const moreNavItems = [
        { id: 'tensions', label: 'Tensions', icon: Zap },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleNavigate = (section: string) => {
        onNavigate(section);
        setShowMoreMenu(false);
    };

    return (
        <>
            {/* More Menu Overlay */}
            {showMoreMenu && (
                <div className="fixed inset-0 z-40 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowMoreMenu(false)}
                    />

                    {/* Menu */}
                    <div className="relative w-full max-w-md mx-4 mb-20 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
                        <div className="p-2">
                            {moreNavItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${activeSection === item.id
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <item.icon size={22} className={activeSection === item.id ? 'text-indigo-500' : 'text-gray-400'} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-pb">
                <div className="flex items-center justify-around h-16">
                    {primaryNavItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 transition-all active:scale-95 ${activeSection === item.id
                                ? 'text-indigo-600'
                                : 'text-gray-400'
                                }`}
                        >
                            <item.icon
                                size={24}
                                className={activeSection === item.id ? 'text-indigo-500' : ''}
                                strokeWidth={activeSection === item.id ? 2.5 : 1.5}
                            />
                            <span className={`text-[10px] font-medium ${activeSection === item.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}

                    {/* More Button */}
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 transition-all active:scale-95 ${showMoreMenu || moreNavItems.some(i => i.id === activeSection)
                            ? 'text-indigo-600'
                            : 'text-gray-400'
                            }`}
                    >
                        {showMoreMenu ? (
                            <X size={24} strokeWidth={2} />
                        ) : (
                            <MoreHorizontal
                                size={24}
                                strokeWidth={moreNavItems.some(i => i.id === activeSection) ? 2.5 : 1.5}
                            />
                        )}
                        <span className={`text-[10px] font-medium ${showMoreMenu || moreNavItems.some(i => i.id === activeSection) ? 'text-indigo-600' : 'text-gray-500'
                            }`}>
                            More
                        </span>
                    </button>
                </div>
            </nav>
        </>
    );
}
