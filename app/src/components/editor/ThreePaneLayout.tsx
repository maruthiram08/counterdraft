"use client";

import { ReactNode } from "react";

interface ThreePaneLayoutProps {
    leftPane: ReactNode;
    middlePane: ReactNode;
    rightPane: ReactNode;
}

export function ThreePaneLayout({ leftPane, middlePane, rightPane }: ThreePaneLayoutProps) {
    return (
        <div className="flex bg-white h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Pane: Sidebar List */}
            <div className="w-[280px] border-r border-[var(--border)] bg-gray-50 flex flex-col shrink-0">
                {leftPane}
            </div>

            {/* Middle Pane: Main Editor */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {middlePane}
            </div>

            {/* Right Pane: Agent Companion */}
            <div className="w-[320px] border-l border-[var(--border)] bg-white flex flex-col shrink-0">
                {rightPane}
            </div>
        </div>
    );
}
