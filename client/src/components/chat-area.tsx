import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MoreVertical, Phone, Video } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { AvatarDisplay } from "@/components/avatar-display";
import type { User, Message } from "@shared/schema";

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

interface ChatAreaProps {
  friend: User | null;
  group?: Group | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isSending: boolean;
}

export function ChatArea({ friend, group, messages, onSendMessage, isSending }: ChatAreaProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleVoiceCall = () => {
    toast({
      title: "Voice Call",
      description: "Voice calling feature coming soon! Make sure Twilio credentials are configured.",
    });
  };

  const handleVideoCall = () => {
    toast({
      title: "Video Call",
      description: "Video calling feature coming soon! Make sure Twilio credentials are configured.",
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && !isSending) {
      onSendMessage(messageInput.trim());
      setMessageInput("");
    }
  };


  if (!friend && !group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <p className="text-lg font-semibold mb-2">{t('messenger.selectConversation')}</p>
          <p className="text-sm text-muted-foreground">
            {t('messenger.selectConversationDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="h-16 border-b border-border px-4 flex items-center justify-between shrink-0 bg-gradient-to-r from-background to-background/95">
        <div className="flex items-center gap-3">
          <div className="relative">
            {friend ? (
              <>
                <AvatarDisplay 
                  username={friend.username} 
                  avatarUrl={friend.avatarUrl}
                  size="md"
                />
                {friend.status === "online" && (
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-status-online border-2 border-background" />
                )}
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <span className="text-sm font-semibold text-primary">{group?.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm" data-testid="text-chat-name">{friend?.username || group?.name}</p>
            <p className="text-xs text-muted-foreground">
              {friend ? (friend.status === "online" ? t('messenger.online') : `${t('messenger.lastSeen')} ${formatDistanceToNow(new Date(friend.lastSeen || new Date()), { addSuffix: true })}`) : `${t('messenger.contacts')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleVoiceCall} data-testid="button-voice-call" title="Voice call">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleVideoCall} data-testid="button-video-call" title="Video call">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-chat-menu">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm px-4">
              <p className="text-sm text-muted-foreground">{t('messenger.noMessages')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('messenger.noMessagesDesc')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isSent = message.senderId === user?.id;
              const showDate =
                index === 0 ||
                new Date(messages[index - 1].createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center mb-4">
                      <span className="text-xs text-muted-foreground font-mono px-3 py-1 rounded-full bg-muted">
                        {format(new Date(message.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${isSent ? "justify-end" : "justify-start"} animate-fade-in gap-2`}
                    data-testid={`message-${message.id}`}
                  >
                    {!isSent && (
                      <AvatarDisplay 
                        username={friend.username} 
                        avatarUrl={friend.avatarUrl}
                        size="sm"
                      />
                    )}
                    <div
                      className={`max-w-[65%] px-4 py-2 rounded-3xl shadow-sm ${
                        isSent
                          ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-sm"
                          : "bg-card border border-card-border text-card-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.content}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-xs opacity-75 font-mono">
                          {format(new Date(message.createdAt), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="h-16 border-t border-border px-4 flex items-center gap-2 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
          <Input
            type="text"
            placeholder={t('messenger.typeMessage')}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 rounded-full"
            disabled={isSending}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageInput.trim() || isSending}
            className="rounded-full shrink-0"
            data-testid="button-send-message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
