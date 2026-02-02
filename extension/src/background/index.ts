console.log("[CounterDraft] Background Service Worker Started");

// Allows users to open the side panel by clicking the action toolbar icon
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {

    // 1. Capture Full Screenshot
    if (message.type === 'CAPTURE_VISIBLE_TAB') {
        // Use implicit current window by passing options as first argument
        // @ts-ignore - The type definition usually allows this overload but might be strict
        chrome.tabs.captureVisibleTab(
            { format: 'png' },
            (dataUrl) => {
                if (chrome.runtime.lastError || !dataUrl) {
                    console.error("Capture failed:", chrome.runtime.lastError);
                    sendResponse({ error: chrome.runtime.lastError?.message || "Capture failed" });
                } else {
                    sendResponse({ dataUrl });
                }
            }
        );
        return true; // Keep channel open
    }

    // 2. Handle Snip Completion (Forward to Sidepanel)
    if (message.type === 'SNIP_COMPLETED') {
        const tabId = sender.tab?.id;

        (async () => {
            let finalUrl = message.payload.pageUrl;
            let finalTitle = message.payload.pageTitle;

            // Attempt to fetch robust data from the browser process
            if (tabId) {
                try {
                    const tab = await chrome.tabs.get(tabId);
                    if (tab.url) finalUrl = tab.url;
                    if (tab.title) finalTitle = tab.title;
                    console.log("[Background] Fetched explicit tab data:", finalUrl);
                } catch (e) {
                    console.error("[Background] Failed to get tab info:", e);
                }
            }

            console.log("Snip coords received:", message.payload);

            // Broadcast to runtime (SidePanel listens to this)
            chrome.runtime.sendMessage({
                type: 'PROCESS_SNIP',
                payload: {
                    ...message.payload,
                    tabId: tabId,
                    pageUrl: finalUrl,
                    pageTitle: finalTitle
                }
            });
        })();
    }
});
