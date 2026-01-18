import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
            <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/workspace"
            />
        </div>
    );
}

