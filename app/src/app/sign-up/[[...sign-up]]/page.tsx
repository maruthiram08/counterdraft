import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
            <SignUp
                path="/sign-up"
                routing="path"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/onboarding"
            />
        </div>
    );
}

