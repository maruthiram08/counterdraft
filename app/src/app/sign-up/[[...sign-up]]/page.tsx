import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
            <SignUp
                appearance={{
                    variables: {
                        colorPrimary: '#d4592a',
                        colorText: '#161c2d',
                        colorTextSecondary: '#4b5164',
                        colorBackground: '#ffffff',
                        colorInputBackground: '#ecedf1',
                        colorInputText: '#161c2d',
                        colorDanger: '#b9473a',
                        borderRadius: '16px',
                        fontFamily: 'inherit',
                    },
                    elements: {
                        card: 'rounded-card shadow-card',
                        formButtonPrimary: 'rounded-full shadow-ember',
                    },
                }}
                path="/sign-up"
                routing="path"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/onboarding"
            />
        </div>
    );
}

