import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MoreVertical, Phone, Video, UserPlus, Check, CheckCheck, Trash2, Edit2, SmilePlus, Ban } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { AvatarDisplay } from "@/components/avatar-display";
import { GroupManagementPanel } from "@/components/group-management-panel";
import { CallModal } from "@/components/call-modal";
import { CallService } from "@/lib/call-service";
import { NotificationService } from "@/lib/notification-service";
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
  ws?: WebSocket | null;
  onMessageUpdate?: (updatedMessage: Message) => void;
  onMessageDelete?: (messageId: string) => void;
}

export function ChatArea({ friend, group, messages, onSendMessage, isSending, ws, onMessageUpdate, onMessageDelete }: ChatAreaProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [reactions, setReactions] = useState<Record<string, any[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(ws || null);

  // Call state
  const [callService, setCallService] = useState<CallService | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{ fromUserId: string; isVideo: boolean; offer: RTCSessionDescriptionInit } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [ongoingCallType, setOngoingCallType] = useState<'voice' | 'video' | null>(null);
  
  // Refs to keep track of current state in WebSocket handlers
  const callServiceRef = useRef<CallService | null>(null);
  const userRef = useRef(user);
  const incomingCallDataRef = useRef<{ fromUserId: string; isVideo: boolean; offer: RTCSessionDescriptionInit } | null>(null);
  const listenerSetupRef = useRef(false);
  const friendRef = useRef(friend);

  // Track connection state for UI
  useEffect(() => {
    friendRef.current = friend;
  }, [friend]);

  useEffect(() => {
    wsRef.current = ws || null;
  }, [ws]);

  // Update refs whenever state changes
  useEffect(() => {
    callServiceRef.current = callService;
    userRef.current = user;
    incomingCallDataRef.current = incomingCallData;
  }, [callService, user, incomingCallData]);

  const initializeCallService = useCallback((isVideo: boolean, recipientId: string) => {
    const service = new CallService(
      (stream) => setRemoteStream(stream),
      (signal) => {
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify(signal));
        }
      },
      () => {
        setShowCallModal(false);
        setLocalStream(null);
        setRemoteStream(null);
        setIsCallConnected(false);
        setOngoingCallType(null);
        setCallService(null);
      }
    );
    setCallService(service);
    setOngoingCallType(isVideo ? 'video' : 'voice');
    return service;
  }, []);

  const handleVoiceCall = async () => {
    if (!friend || !user) return;
    try {
      const service = initializeCallService(false, friend.id);
      const { offer } = await service.initializeCall(false, friend.id, user.id);
      setLocalStream(service.getLocalStream());
      setShowCallModal(true);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-offer',
          toUserId: friend.id,
          fromUserId: user.id,
          callerName: user.username,
          isVideo: false,
          offer,
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start voice call. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleVideoCall = async () => {
    if (!friend || !user) return;
    try {
      const service = initializeCallService(true, friend.id);
      const { offer } = await service.initializeCall(true, friend.id, user.id);
      setLocalStream(service.getLocalStream());
      setShowCallModal(true);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-offer',
          toUserId: friend.id,
          fromUserId: user.id,
          callerName: user.username,
          isVideo: true,
          offer,
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start video call. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCallData || !callService || !user) return;
    try {
      const answer = await callService.handleOffer(incomingCallData.offer, incomingCallData.isVideo, incomingCallData.fromUserId, user.id);
      setLocalStream(callService.getLocalStream());
      setIsCallConnected(true);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-answer',
          toUserId: incomingCallData.fromUserId,
          answer,
        }));
      }
      setIncomingCallData(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept call",
        variant: "destructive",
      });
      handleDeclineCall();
    }
  };

  const handleDeclineCall = () => {
    if (callService) {
      callService.endCall();
    }
    setIncomingCallData(null);
    setCallService(null);
  };

  const handleEndCall = () => {
    if (callService && user && incomingCallData) {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-end',
          toUserId: incomingCallData.fromUserId,
        }));
      }
      callService.endCall();
    } else if (callService && friend && user) {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-end',
          toUserId: friend.id,
        }));
      }
      callService.endCall();
    }
  };

  const getRecipientName = (): string => {
    const name = friend?.username || group?.name || "Unknown";
    return String(name);
  };

  // Setup WebSocket listener for incoming calls - attach once and use refs for state
  useEffect(() => {
    if (!wsRef.current || listenerSetupRef.current) return;

    const handleCallMessage = async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'incoming-call') {
          if (!callServiceRef.current) {
            console.log('Incoming call from', message.fromUserId, 'isVideo:', message.isVideo);
            const service = initializeCallService(message.isVideo, message.fromUserId);
            callServiceRef.current = service; // Update ref immediately
            setIncomingCallData({
              fromUserId: message.fromUserId,
              isVideo: message.isVideo,
              offer: message.offer,
            });
            setShowCallModal(true);

            // Send notification with sound
            const callerName = message.callerName || 'Unknown';
            await NotificationService.sendCallNotification(
              callerName,
              message.isVideo,
              () => {
                // Accept call handler will be called by user clicking the modal
              },
              () => {
                // Decline handler
                handleDeclineCall();
              }
            );
          }
        }

        if (message.type === 'call-answer') {
          console.log('Call answer received');
          if (callServiceRef.current) {
            await callServiceRef.current.handleAnswer(message.answer);
            setIsCallConnected(true);
          }
        }

        if (message.type === 'ice-candidate') {
          if (callServiceRef.current) {
            await callServiceRef.current.handleIceCandidate(message.candidate);
          }
        }

        if (message.type === 'call-ended') {
          console.log('Call ended');
          if (callServiceRef.current) {
            callServiceRef.current.endCall();
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    wsRef.current.addEventListener('message', handleCallMessage);
    listenerSetupRef.current = true;

    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', handleCallMessage);
      }
    };
  }, []);

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
      setIsTyping(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      if (wsRef.current && (friend || group)) {
        wsRef.current.send(JSON.stringify({
          type: friend ? 'typing' : 'group-typing',
          toUserId: friend?.id,
          groupId: group?.id,
          isTyping: true,
        }));
      }
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (e.target.value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (wsRef.current && (friend || group)) {
          wsRef.current.send(JSON.stringify({
            type: friend ? 'typing' : 'group-typing',
            toUserId: friend?.id,
            groupId: group?.id,
            isTyping: false,
          }));
        }
      }, 1000);
    } else {
      setIsTyping(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      onMessageDelete?.(messageId);
      toast({ title: "Message deleted" });
    } catch (error) {
      toast({ title: "Error deleting message", variant: "destructive" });
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      
      if (response.ok) {
        const updatedMessage = await response.json();
        onMessageUpdate?.(updatedMessage);
        setEditingMessageId(null);
        toast({ title: "Message updated" });
      }
    } catch (error) {
      toast({ title: "Error editing message", variant: "destructive" });
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const existing = reactions[messageId] || [];
      setReactions({
        ...reactions,
        [messageId]: [...existing, { emoji, userId: user?.id }]
      });
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Failed to add reaction');
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reactions/${emoji}`, { method: 'DELETE' });
      setReactions({
        ...reactions,
        [messageId]: (reactions[messageId] || []).filter(r => r.emoji !== emoji)
      });
    } catch (error) {
      console.error('Failed to remove reaction');
    }
  };

  const handleBlockUser = async () => {
    if (!friend || !user) return;
    try {
      if (isBlocked) {
        // Unblock user
        await fetch(`/api/users/${user.id}/block/${friend.id}`, { method: 'DELETE' });
        setIsBlocked(false);
        toast({ title: "User unblocked" });
      } else {
        // Block user
        await fetch(`/api/users/${user.id}/block/${friend.id}`, { method: 'POST' });
        setIsBlocked(true);
        toast({ title: "User blocked" });
      }
    } catch (error) {
      toast({ title: "Error updating block status", variant: "destructive" });
    }
  };

  // Load reactions for all messages and check block status
  useEffect(() => {
    const loadReactions = async () => {
      const newReactions: Record<string, any[]> = {};
      for (const message of messages) {
        try {
          const res = await fetch(`/api/messages/${message.id}/reactions`);
          if (res.ok) {
            const data = await res.json();
            newReactions[message.id] = data;
          }
        } catch (error) {
          console.error(`Failed to load reactions for message ${message.id}`);
        }
      }
      setReactions(newReactions);
    };
    
    if (messages.length > 0) {
      loadReactions();
    }
  }, [messages.map(m => m.id).join(',')]);

  // Check block status when friend changes
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!friend || !user) {
        setIsBlocked(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/users/${user.id}/block/${friend.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsBlocked(data.isBlocked);
        }
      } catch (error) {
        console.error('Failed to check block status');
      }
    };
    
    checkBlockStatus();
  }, [friend?.id, user?.id]);

  // Setup WebSocket handlers (typing, blocking, etc)
  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle block/unblock notifications
        if (message.type === 'user-blocked') {
          setIsBlockedByOther(true);
          toast({ title: `${message.blockedBy} has blocked you`, variant: "destructive" });
        }
        if (message.type === 'user-unblocked') {
          setIsBlockedByOther(false);
          toast({ title: `${message.unblockedBy} has unblocked you` });
        }
        
        // Handle typing
        if (message.type === 'typing' && message.fromUserId) {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            if (message.isTyping) {
              updated.add(message.fromUserId);
            } else {
              updated.delete(message.fromUserId);
            }
            return updated;
          });
        }
        if (message.type === 'group-typing' && message.fromUserId) {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            if (message.isTyping) {
              updated.add(message.fromUserId);
            } else {
              updated.delete(message.fromUserId);
            }
            return updated;
          });
        }
      } catch (error) {
        console.error('Error handling typing message:', error);
      }
    };

    wsRef.current.addEventListener('message', handleMessage);
    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, []);


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
    <div className="flex-1 flex flex-col bg-background min-h-0">
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
          {group && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGroupPanel(true)}
                data-testid="button-add-members"
                title="Add members"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGroupPanel(!showGroupPanel)}
                data-testid="button-group-info"
                title="Group info"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </>
          )}
          {!group && (
            <>
              <Button variant="ghost" size="icon" onClick={handleBlockUser} data-testid="button-block-user" title="Block user">
                <Ban className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-chat-menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollAreaRef}>
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
                    className={`flex ${isSent ? "justify-end" : "justify-start"} animate-fade-in gap-2 group`}
                    data-testid={`message-${message.id}`}
                  >
                    {!isSent && (
                      <AvatarDisplay 
                        username={friend?.username || 'Group'} 
                        avatarUrl={friend?.avatarUrl}
                        size="sm"
                      />
                    )}
                    <div className="flex flex-col gap-1 max-w-[65%]">
                      <div
                        className={`px-4 py-2 rounded-3xl shadow-sm ${
                          isSent
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-br-sm"
                            : "bg-card border border-card-border text-card-foreground rounded-bl-sm"
                        }`}
                      >
                        {editingMessageId === message.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="flex-1 bg-background/20 rounded px-2 py-1 text-sm text-current"
                              data-testid="input-edit-message"
                            />
                            <button
                              onClick={() => handleEditMessage(message.id, editingContent)}
                              className="text-xs font-semibold hover:opacity-80"
                              data-testid="button-confirm-edit"
                            >
                              {t('messenger.save')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className={`text-sm leading-relaxed break-words ${message.isDeleted ? 'italic opacity-50' : ''}`} data-testid={`text-message-${message.id}`}>
                              {message.isDeleted ? t('messenger.deletedMessage') : message.content}
                              {message.editedAt && !message.isDeleted && <span className="text-xs opacity-75 ml-1">{t('messenger.edited')}</span>}
                            </p>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <span className="text-xs opacity-75 font-mono">
                                {format(new Date(message.createdAt), "HH:mm")}
                              </span>
                              {isSent && (
                                message.isRead ? (
                                  <CheckCheck className="h-3 w-3" data-testid="icon-read-receipt" />
                                ) : message.isDelivered ? (
                                  <Check className="h-3 w-3" data-testid="icon-delivered-receipt" />
                                ) : (
                                  <Check className="h-3 w-3 opacity-50" data-testid="icon-sent-receipt" />
                                )
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {showReactionPicker === message.id && (
                        <div className="flex gap-1">
                          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(message.id, emoji)}
                              className="text-lg hover:scale-125 transition-transform"
                              data-testid={`button-emoji-${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      {reactions[message.id] && reactions[message.id].length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(
                            reactions[message.id].reduce((acc: Record<string, number>, r: any) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleRemoveReaction(message.id, emoji)}
                              className="px-2 py-1 bg-muted rounded-full text-xs hover:bg-muted/80 flex items-center gap-1"
                              data-testid={`button-reaction-${emoji}-${message.id}`}
                            >
                              {emoji} {count}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {!message.isDeleted && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                          className="p-1 hover:bg-muted rounded"
                          data-testid="button-add-reaction"
                          title="React"
                        >
                          <SmilePlus className="h-3 w-3" />
                        </button>
                        {isSent && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingContent(message.content);
                              }}
                              className="p-1 hover:bg-muted rounded"
                              data-testid="button-edit-message"
                              title="Edit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="p-1 hover:bg-destructive/20 rounded"
                              data-testid="button-delete-message"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-2 bg-background shrink-0">
        {typingUsers.size > 0 && (
          <div className="text-xs text-muted-foreground mb-2 animate-pulse">
            {Array.from(typingUsers).slice(0, 2).join(', ')} {typingUsers.size === 1 ? t('messenger.isTyping') : t('messenger.areTyping')}...
          </div>
        )}
        {isBlocked && (
          <div className="text-xs text-destructive mb-2 px-2 py-1 bg-destructive/10 rounded">
            You cannot message this user - contact is blocked
          </div>
        )}
        {isBlockedByOther && (
          <div className="text-xs text-destructive mb-2 px-2 py-1 bg-destructive/10 rounded">
            This user has blocked you - you cannot send messages
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder={t('messenger.typeMessage')}
            value={messageInput}
            onChange={handleTyping}
            className="flex-1 rounded-full h-9 text-sm"
            disabled={isSending || isBlocked || isBlockedByOther}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageInput.trim() || isSending || isBlocked || isBlockedByOther}
            className="rounded-full shrink-0 h-9 w-9"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {showGroupPanel && group && (
        <GroupManagementPanel
          groupId={group.id}
          groupName={group.name}
          isCreator={group.createdBy === user?.id}
          createdById={group.createdBy}
          onClose={() => setShowGroupPanel(false)}
        />
      )}

      {showCallModal && (
        <CallModal
          recipientName={getRecipientName()}
          recipientAvatarUrl={friend?.avatarUrl || undefined}
          isIncoming={!!incomingCallData}
          isVideo={ongoingCallType === 'video'}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEnd={handleEndCall}
          isConnected={isCallConnected}
        />
      )}
    </div>
  );
}
