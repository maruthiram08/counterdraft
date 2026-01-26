import { useState, useEffect, ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

interface ThreePaneLayoutProps {
    leftPane: ReactNode;
    middlePane: ReactNode;
    rightPane: ReactNode;
}

export function ThreePaneLayout({ leftPane, middlePane, rightPane }: ThreePaneLayoutProps) {
    const [isLeftPaneVisible, setIsLeftPaneVisible] = useState(true);
    const [isRightPaneVisible, setIsRightPaneVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    // Detect screen size and auto-adjust pane visibility
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 768;
            const tablet = width >= 768 && width < 1024;

            setIsMobile(mobile);
            setIsTablet(tablet);

            // Auto-hide panes based on breakpoints (only on initial load or resize down)
            if (mobile) {
                setIsLeftPaneVisible(false);
                setIsRightPaneVisible(false);
            } else if (tablet) {
                setIsRightPaneVisible(false);
                // Keep left pane visible on tablet
            }
        };

        // Initial check
        handleResize();

        // Listen for resize
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="h-full bg-paper overflow-hidden relative flex flex-row w-full">

            {/* Left Pane: Sidebar List */}
            <div
                className={`h-full border-r border-gray-200/60 bg-gray-50/50 backdrop-blur-sm relative flex-shrink-0 transition-all duration-300 ease-in-out ${isLeftPaneVisible ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden'
                    }`}
                style={{
                    width: isLeftPaneVisible ? (isMobile ? '100%' : isTablet ? '280px' : '20%') : '0',
                    minWidth: isLeftPaneVisible ? (isMobile ? '100%' : '240px') : '0'
                }}
            >
                <div className="h-full flex flex-col relative group">
                    {leftPane}
                    <button
                        onClick={() => setIsLeftPaneVisible(false)}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 bg-white/90 rounded-md border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity z-10"
                        title="Collapse Drafts"
                    >
                        <PanelLeftClose size={16} />
                    </button>
                </div>
            </div>

            {/* Middle Pane: Main Editor (Flex Grow) */}
            <div className="flex-1 h-full relative min-w-0 bg-paper">
                <div className="h-full flex flex-col min-w-0 relative">

                    {/* Expand Left Button - Always visible when pane hidden */}
                    {!isLeftPaneVisible && (
                        <button
                            onClick={() => setIsLeftPaneVisible(true)}
                            className="absolute top-4 left-4 z-20 p-2.5 text-gray-500 hover:text-[var(--accent)] bg-white border border-gray-200 shadow-md rounded-xl transition-all hover:shadow-lg active:scale-95"
                            title="Show Drafts"
                        >
                            <PanelLeftOpen size={20} />
                        </button>
                    )}

                    {/* Expand Right Button - Always visible when pane hidden */}
                    {!isRightPaneVisible && (
                        <button
                            onClick={() => setIsRightPaneVisible(true)}
                            className="absolute top-4 right-4 z-20 p-2.5 text-gray-500 hover:text-[var(--accent)] bg-white border border-gray-200 shadow-md rounded-xl transition-all hover:shadow-lg active:scale-95"
                            title="Show Agent"
                        >
                            <PanelRightOpen size={20} />
                        </button>
                    )}

                    {middlePane}
                </div>
            </div>

            {/* Right Pane: Agent Companion */}
            <div
                className={`h-full border-l border-gray-200/60 bg-paper relative flex-shrink-0 transition-all duration-300 ease-in-out ${isRightPaneVisible ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden'
                    }`}
                style={{
                    width: isRightPaneVisible ? (isMobile ? '100%' : '35%') : '0',
                    minWidth: isRightPaneVisible ? (isMobile ? '100%' : '320px') : '0'
                }}
            >
                <div className="h-full flex flex-col relative group">
                    {rightPane}
                    <button
                        onClick={() => setIsRightPaneVisible(false)}
                        className="absolute top-2 left-2 p-1.5 text-gray-400 hover:text-gray-600 bg-white/90 rounded-md border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity z-10"
                        title="Collapse Agent"
                    >
                        <PanelRightClose size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
}

