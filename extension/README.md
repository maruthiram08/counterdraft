# CounterDraft Lens (Chrome extension)

Lens is CounterDraft's capture layer. It adds a side panel to Chrome where you can snip part of a
page (or bookmark the whole page), tag why you're saving it, and send it to `/api/brain/capture`
in the CounterDraft app, which analyses it and adds it to your brain.

It is not on the Chrome Web Store yet, so it has to be built and loaded unpacked.

## Build

```bash
cd extension
npm install
VITE_APP_URL=https://www.counterdraft.com npm run build   # point at production
npm run build                                             # or leave unset for http://localhost:3000
```

`VITE_APP_URL` is the CounterDraft app the extension reads your sign-in cookie from and posts
captures to. It is baked in at build time. Use the www host: counterdraft.com redirects to
www.counterdraft.com, the sign-in cookie lives on www, and a redirected POST reaches the server
with `Origin: null` (the middleware allows that only when Chrome marks it `Sec-Fetch-Site: none`).

## Load it in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `extension/dist`.
3. Sign in to CounterDraft in the same browser, then click the Lens icon to open the side panel.

## How Frame captures work

Frame captures the whole element you click, not just the part on screen. `src/content/captureElement.ts`
opens any "…see more" button inside it, hides fixed and sticky bars (like LinkedIn's top nav), scrolls
the element through the window one screenful at a time and takes a screenshot of each (Chrome allows
two per second, so a long post takes a couple of seconds), then puts the page back where it was. The
side panel joins the strips into one image. The element's text is sent along as `pageText`, because
the AI model scales a tall image down before reading it. Very long elements stop at 12,000px of image.

## Server side

If the app sets `ALLOWED_EXTENSIONS`, add this extension's ID (shown on `chrome://extensions`) to
that comma-separated list, or the middleware rejects its requests.

## Publishing

To list it on the Chrome Web Store, build with the production `VITE_APP_URL`, zip the contents of
`dist`, and upload it from the Chrome Web Store developer dashboard. Then set
`NEXT_PUBLIC_CHROME_EXTENSION_URL` in the app to the listing URL so Settings shows an install button.
