"use client";

import { ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface ThreePaneLayoutProps {
    leftPane: ReactNode;
    middlePane: ReactNode;
    rightPane: ReactNode;
}

export function ThreePaneLayout({ leftPane, middlePane, rightPane }: ThreePaneLayoutProps) {
    return (
        <div className="h-full bg-white overflow-hidden">
            <ResizablePanelGroup orientation="horizontal">

                {/* Left Pane: Sidebar List (15%) */}
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25} className="bg-gray-50/30">
                    <div className="h-full border-r border-gray-100 flex flex-col">
                        {leftPane}
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle={false} className="w-px bg-gray-100 hover:bg-gray-300 transition-colors" />

                {/* Middle Pane: Main Editor (55%) */}
                <ResizablePanel defaultSize={55} minSize={30} className="bg-white">
                    <div className="h-full flex flex-col min-w-0">
                        {middlePane}
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle={false} className="w-px bg-gray-100 hover:bg-gray-300 transition-colors" />

                {/* Right Pane: Agent Companion (30%) */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={45} className="bg-white">
                    <div className="h-full border-l border-gray-100 flex flex-col">
                        {rightPane}
                    </div>
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    );
}
