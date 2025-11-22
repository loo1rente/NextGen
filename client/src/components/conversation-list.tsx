import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User, Message } from "@shared/schema";

interface Conversation {
  friend: User;
  lastMessage?: Message;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedFriendId: string | null;
  onSelectConversation: (friendId: string) => void;
  currentUserId: string;
}

export function ConversationList({
  conversations,
  selectedFriendId,
  onSelectConversation,
  currentUserId,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&size=128`;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full lg:w-80 border-r border-border flex flex-col h-full bg-card">
      <div className="p-3 border-b border-card-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? "Try a different search" : "Add friends to start chatting"}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conv) => {
              const isSelected = conv.friend.id === selectedFriendId;
              const isSent = conv.lastMessage?.senderId === currentUserId;

              return (
                <button
                  key={conv.friend.id}
                  onClick={() => onSelectConversation(conv.friend.id)}
                  className={`w-full p-3 rounded-md text-left transition-colors hover-elevate active-elevate-2 ${
                    isSelected ? "bg-accent" : ""
                  }`}
                  data-testid={`button-conversation-${conv.friend.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <img src={getAvatarUrl(conv.friend.username)} alt={conv.friend.username} />
                        <AvatarFallback>{getInitials(conv.friend.username)}</AvatarFallback>
                      </Avatar>
                      {conv.friend.status === "online" && (
                        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-status-online border-2 border-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{conv.friend.username}</p>
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage
                            ? `${isSent ? "You: " : ""}${conv.lastMessage.content}`
                            : "No messages yet"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="h-5 min-w-5 px-1.5 text-xs shrink-0"
                            data-testid={`badge-unread-${conv.friend.id}`}
                          >
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
