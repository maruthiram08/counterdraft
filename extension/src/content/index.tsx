import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';
import { FrameOverlay } from './FrameOverlay';

console.log("[CounterDraft] Content Script Loader");

// Create host container
const container = document.createElement('div');
container.id = 'counterdraft-lens-host';
document.body.appendChild(container);

// Create shadow root for style isolation
const shadowRoot = container.attachShadow({ mode: 'open' });

// Create mount point inside shadow
const bgRoot = document.createElement('div');
shadowRoot.appendChild(bgRoot);

// Render Overlay
createRoot(bgRoot).render(
    <>
        <Overlay />
        <FrameOverlay />
    </>
);
