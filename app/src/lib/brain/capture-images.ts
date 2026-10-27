import { supabaseAdmin } from '@/lib/supabase-admin';

// Snip and frame images live in the references bucket (the one Repurpose covers use), under the user's id.
// The bucket serves public URLs, so paths carry a random id that can't be guessed.
const BUCKET = 'references';
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

// The data URL Lens sends, as bytes and a content type; null for anything that isn't an image we keep
export function decodeImage(dataUrl: string): { bytes: Buffer; contentType: string; ext: string } | null {
    const match = /^data:(image\/[a-z]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (!match || !TYPES[match[1]]) return null;
    const bytes = Buffer.from(match[2], 'base64');
    return bytes.length ? { bytes, contentType: match[1], ext: TYPES[match[1]] } : null;
}

// Saves the image and returns its storage path, or null if it could not be stored (the capture is kept anyway)
export async function storeCaptureImage(userId: string, dataUrl: string): Promise<string | null> {
    const image = decodeImage(dataUrl);
    if (!image) return null;
    const path = `${userId}/captures/${crypto.randomUUID()}.${image.ext}`;
    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, image.bytes, { contentType: image.contentType, upsert: false });
    if (error) {
        console.error('Storing capture image failed:', error);
        return null;
    }
    return path;
}

export function captureImageUrl(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeCaptureImage(path: string | null | undefined): Promise<void> {
    if (!path) return;
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) console.error('Removing capture image failed:', error);
}
