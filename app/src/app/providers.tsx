'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Only initialize if the key is present (avoids crashes in dev if missing)
        if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
                person_profiles: 'identified_only', // Use 'always' to track anonymous users too
                capture_pageview: false, // Disable automatic pageview capture, as we capture manually
                loaded: (ph) => { console.log('PostHog loaded:', ph) },
                debug: true, // Enable debug mode for visibility in console
            })
        }
    }, [])

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
