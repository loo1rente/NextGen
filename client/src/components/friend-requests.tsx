import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
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
  const { t } = useLanguage();

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&size=128`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">{t('messenger.requests_short')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {requests.length === 0 ? t('messenger.noPendingRequests') : `${requests.length} ${requests.length !== 1 ? t('messenger.pendingRequests') : t('messenger.pendingRequest')}`}
        </p>
      </div>

      <ScrollArea className="flex-1">
        {requests.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground">{t('messenger.noFriendRequests')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('messenger.noFriendRequestsDesc')}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="p-4 border border-card-border hover:shadow-md transition-all hover-elevate">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <img src={getAvatarUrl(request.requester.username)} alt={request.requester.username} />
                    <AvatarFallback>{getInitials(request.requester.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" data-testid={`text-requester-${request.id}`}>
                      {request.requester.username}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('messenger.sendRequest')}</p>
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
                      {t('messenger.accept')}
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
                      {t('messenger.decline')}
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
