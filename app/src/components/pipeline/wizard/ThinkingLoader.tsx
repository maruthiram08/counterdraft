import { Loader } from "@/components/shared/Loading";

interface ThinkingLoaderProps {
    message: string;
}

// AI work inside the writing wizard: the standard Loader in a pressed tray
export function ThinkingLoader({ message }: ThinkingLoaderProps) {
    return <Loader tray label={message} />;
}
