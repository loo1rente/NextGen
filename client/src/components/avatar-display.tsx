import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarDisplayProps {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export function AvatarDisplay({ username, avatarUrl, size = "md" }: AvatarDisplayProps) {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128`;
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  // Use custom avatar if available, otherwise use generated avatar
  const imageUrl = avatarUrl || getAvatarUrl(username);

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarImage src={imageUrl} alt={username} />
      <AvatarFallback>{getInitials(username)}</AvatarFallback>
    </Avatar>
  );
}
