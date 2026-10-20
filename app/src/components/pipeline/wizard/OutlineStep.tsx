
import { DndContext, closestCenter, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Check } from 'lucide-react';
import { ResearchPoint } from "./types";
import { ResearchItem } from "../ResearchItem";
import { Loader2 } from "lucide-react";

// Helper Sortable Component
function SortableOutlineItem({
    id,
    index,
    section,
    onUpdate,
    onAddNote,
    onDeleteNote,
    onDelete
}: {
    id: string;
    index: number;
    section: ResearchPoint;
    onUpdate: (val: string) => void;
    onAddNote: (note: string) => void;
    onDeleteNote: (idx: number) => void;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as const : 'static' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-start gap-2 group ${isDragging ? 'opacity-50' : ''}`}>
            <div
                {...attributes}
                {...listeners}
                className="mt-2.5 p-1 text-ink-muted/60 hover:text-ink cursor-grab active:cursor-grabbing active:shadow-pressed rounded-full"
            >
                <GripVertical size={14} />
            </div>

            <span className="w-8 h-8 bg-canvas text-ink text-xs font-medium rounded-full flex items-center justify-center shrink-0 shadow-raised mt-1">
                {index + 1}
            </span>
            <div className="flex-1">
                <ResearchItem
                    showBullet={false}
                    text={section.text}
                    notes={section.notes}
                    isNew={section.isNew}
                    onUpdate={onUpdate}
                    onAddNote={onAddNote}
                    onDeleteNote={onDeleteNote}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

interface OutlineStepProps {
    outline: ResearchPoint[];
    loading: boolean;
    outlineApproved: boolean;
    sensors: SensorDescriptor<SensorOptions>[];
    onAddOutlinePoint: () => void;
    onUpdateOutlinePoint: (index: number, updates: Partial<ResearchPoint>) => void;
    onDeleteOutlinePoint: (index: number) => void;
    onSetOutlineApproved: (approved: boolean) => void;
    onDragEnd: (event: DragEndEvent) => void;
}

export function OutlineStep({
    outline,
    loading,
    outlineApproved,
    sensors,
    onAddOutlinePoint,
    onUpdateOutlinePoint,
    onDeleteOutlinePoint,
    onSetOutlineApproved,
    onDragEnd
}: OutlineStepProps) {

    if (loading) {
        return (
            <div className="flex flex-col items-center py-12 text-ink-muted">
                <Loader2 size={32} className="animate-spin mb-4 text-ember-500" />
                <p>Generating outline...</p>
            </div>
        );
    }

    if (outline.length === 0) {
        return <p className="text-ink-soft">No outline generated.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">Proposed Outline</h3>
                <button
                    onClick={onAddOutlinePoint}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                >
                    <Plus size={14} className="text-ember-500" />
                    Add Section
                </button>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
            >
                <SortableContext
                    items={outline.map((_, i) => `item-${i}`)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {outline.map((section, i) => (
                            <SortableOutlineItem
                                key={`item-${i}`}
                                id={`item-${i}`}
                                index={i}
                                section={section}
                                onUpdate={(txt) => onUpdateOutlinePoint(i, { text: txt })}
                                onAddNote={(note) => onUpdateOutlinePoint(i, { notes: [...section.notes, note] })}
                                onDeleteNote={(nIdx) => onUpdateOutlinePoint(i, { notes: section.notes.filter((_, idx) => idx !== nIdx) })}
                                onDelete={() => onDeleteOutlinePoint(i)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            <label className="flex items-center gap-2 mt-4 p-4 bg-sage-100 rounded-tile shadow-raised cursor-pointer hover:bg-sage-100/70 transition-all">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${outlineApproved ? 'bg-sage-500 text-white' : 'bg-canvas shadow-well'}`}>
                    {outlineApproved && <Check size={14} />}
                </div>
                <input
                    type="checkbox"
                    className="hidden"
                    checked={outlineApproved}
                    onChange={(e) => onSetOutlineApproved(e.target.checked)}
                />
                <span className="text-sm font-medium text-sage-700 select-none">I approve this outline structure</span>
            </label>
        </div>
    );
}
