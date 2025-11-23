import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/lib/language-context";
import { AvatarDisplay } from "@/components/avatar-display";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import type { User, Message } from "@shared/schema";

interface Conversation {
  friend: User;
  lastMessage?: Message;
  unreadCount: number;
}

interface GroupConversation {
  group: { id: string; name: string; description?: string; createdBy: string; createdAt: string };
  lastMessage?: any;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  groupConversations?: GroupConversation[];
  selectedFriendId: string | null;
  selectedGroupId?: string | null;
  onSelectConversation: (friendId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  currentUserId: string;
}

export function ConversationList({
  conversations,
  groupConversations = [],
  selectedFriendId,
  selectedGroupId,
  onSelectConversation,
  onSelectGroup = () => {},
  currentUserId,
}: ConversationListProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const filteredConversations = conversations.filter((conv) =>
    conv.friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroupConversations = groupConversations.filter((conv) =>
    conv.group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allConversations = [
    ...filteredConversations.map(c => ({ type: 'friend' as const, id: c.friend.id, ...c })),
    ...filteredGroupConversations.map(c => ({ type: 'group' as const, id: c.group.id, ...c }))
  ];

  return (
    <div className="hidden md:flex md:w-72 lg:w-80 border-r border-border flex-col h-full bg-card shrink-0">
      <div className="p-3 border-b border-card-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('messenger.searchConversations')}
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
          <Button 
            size="icon" 
            variant="default" 
            onClick={() => setCreateGroupOpen(true)}
            className="shrink-0"
            data-testid="button-create-group"
            title={t('messenger.createGroup')}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <CreateGroupDialog 
        open={createGroupOpen} 
        onOpenChange={setCreateGroupOpen}
      />

      <ScrollArea className="flex-1">
        {allConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">
              {searchQuery ? t('messenger.noConversations') : t('messenger.noConversations')}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? "Try a different search" : t('messenger.noConversationsDesc')}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {allConversations.map((conv) => {
              if (conv.type === 'friend') {
                const isSelected = conv.friend.id === selectedFriendId;
                const isSent = conv.lastMessage?.senderId === currentUserId;

                return (
                  <button
                    key={conv.friend.id}
                    onClick={() => onSelectConversation(conv.friend.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all hover-elevate active-elevate-2 ${
                      isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                    }`}
                    data-testid={`button-conversation-${conv.friend.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <AvatarDisplay 
                          username={conv.friend.username} 
                          avatarUrl={conv.friend.avatarUrl}
                          size="md"
                        />
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
                              : t('messenger.noMessages')}
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
              } else {
                const isSelected = conv.group.id === selectedGroupId;
                const isSent = conv.lastMessage?.senderId === currentUserId;

                return (
                  <button
                    key={conv.group.id}
                    onClick={() => onSelectGroup(conv.group.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all hover-elevate active-elevate-2 ${
                      isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                    }`}
                    data-testid={`button-group-${conv.group.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 shrink-0">
                        <span className="text-xs font-semibold text-primary">{conv.group.name.charAt(0).toUpperCase()}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm truncate">{conv.group.name}</p>
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
                              : t('messenger.noMessages')}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge
                              variant="default"
                              className="h-5 min-w-5 px-1.5 text-xs shrink-0"
                              data-testid={`badge-unread-group-${conv.group.id}`}
                            >
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
