# CounterDraft Lens (Chrome extension)

Lens is CounterDraft's capture layer. It adds a side panel to Chrome where you can snip part of a
page (or bookmark the whole page), tag why you're saving it, and send it to `/api/brain/capture`
in the CounterDraft app, which analyses it and adds it to your brain.

It is not on the Chrome Web Store yet, so it has to be built and loaded unpacked.

## Build

```bash
cd extension
npm install
VITE_APP_URL=https://counterdraft.com npm run build   # point at production
npm run build                                         # or leave unset for http://localhost:3000
```

`VITE_APP_URL` is the CounterDraft app the extension reads your sign-in cookie from and posts
captures to. It is baked in at build time.

## Load it in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `extension/dist`.
3. Sign in to CounterDraft in the same browser, then click the Lens icon to open the side panel.

## Server side

If the app sets `ALLOWED_EXTENSIONS`, add this extension's ID (shown on `chrome://extensions`) to
that comma-separated list, or the middleware rejects its requests.

## Publishing

To list it on the Chrome Web Store, build with the production `VITE_APP_URL`, zip the contents of
`dist`, and upload it from the Chrome Web Store developer dashboard. Then set
`NEXT_PUBLIC_CHROME_EXTENSION_URL` in the app to the listing URL so Settings shows an install button.
