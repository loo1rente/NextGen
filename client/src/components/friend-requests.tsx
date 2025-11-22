import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import type { User, Friendship } from "@shared/schema";

interface FriendRequestWithUser extends Friendship {
  requester: User;
}

interface FriendRequestsProps {
  requests: FriendRequestWithUser[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isLoading: boolean;
}

export function FriendRequests({ requests, onAccept, onDecline, isLoading }: FriendRequestsProps) {
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&size=128`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Friend Requests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {requests.length === 0 ? "No pending requests" : `${requests.length} pending request${requests.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {requests.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground">No friend requests</p>
              <p className="text-xs text-muted-foreground mt-1">
                When someone sends you a friend request, it will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <img src={getAvatarUrl(request.requester.username)} alt={request.requester.username} />
                    <AvatarFallback>{getInitials(request.requester.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" data-testid={`text-requester-${request.id}`}>
                      {request.requester.username}
                    </p>
                    <p className="text-xs text-muted-foreground">Wants to connect with you</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onAccept(request.id)}
                      disabled={isLoading}
                      className="gap-1"
                      data-testid={`button-accept-${request.id}`}
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDecline(request.id)}
                      disabled={isLoading}
                      className="gap-1"
                      data-testid={`button-decline-${request.id}`}
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
