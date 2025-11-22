import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, UserPlus, Settings, LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";

interface UserSidebarProps {
  activeView: "chats" | "contacts" | "requests" | "settings" | "admin";
  onViewChange: (view: "chats" | "contacts" | "requests" | "settings" | "admin") => void;
  pendingRequestsCount: number;
}

export function UserSidebar({ activeView, onViewChange, pendingRequestsCount }: UserSidebarProps) {
  const { user, logout } = useAuth();

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&size=128`;
  };

  return (
    <div className="w-20 lg:w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <img src={getAvatarUrl(user?.username || "")} alt={user?.username} />
              <AvatarFallback>{getInitials(user?.username || "")}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-status-online border-2 border-sidebar" />
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" data-testid="text-username">{user?.username}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <Button
          variant={activeView === "chats" ? "secondary" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => onViewChange("chats")}
          data-testid="button-nav-chats"
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Chats</span>
        </Button>

        <Button
          variant={activeView === "contacts" ? "secondary" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => onViewChange("contacts")}
          data-testid="button-nav-contacts"
        >
          <Users className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Contacts</span>
        </Button>

        <Button
          variant={activeView === "requests" ? "secondary" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => onViewChange("requests")}
          data-testid="button-nav-requests"
        >
          <UserPlus className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Friend Requests</span>
          {pendingRequestsCount > 0 && (
            <Badge className="ml-auto hidden lg:flex" data-testid="badge-pending-count">
              {pendingRequestsCount}
            </Badge>
          )}
        </Button>
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1">
        {user?.isAdmin && (
          <Button
            variant={activeView === "admin" ? "secondary" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => onViewChange("admin")}
            data-testid="button-nav-admin"
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Admin</span>
          </Button>
        )}

        <Button
          variant={activeView === "settings" ? "secondary" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => onViewChange("settings")}
          data-testid="button-nav-settings"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Settings</span>
        </Button>

        <div className="px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground hidden lg:inline">Theme</span>
          <ThemeToggle />
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden lg:inline">Logout</span>
        </Button>
      </div>
    </div>
  );
}
