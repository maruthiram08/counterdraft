import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-sync";

export async function GET() {
    try {
        const userId = await getOrCreateUser();

        if (!userId) {
            return NextResponse.json({ userId: null, authenticated: false });
        }

        return NextResponse.json({ userId, authenticated: true });
    } catch (error) {
        console.error("Error getting user:", error);
        return NextResponse.json({ userId: null, authenticated: false, error: "Failed to get user" });
    }
}
