import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { UserSidebar } from "@/components/user-sidebar";
import { ConversationList } from "@/components/conversation-list";
import { ChatArea } from "@/components/chat-area";
import { FriendRequests } from "@/components/friend-requests";
import { ContactsList } from "@/components/contacts-list";
import { AddFriendDialog } from "@/components/add-friend-dialog";
import AdminPage from "@/pages/admin";
import SettingsPage from "@/pages/settings";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Message, Friendship } from "@shared/schema";

interface FriendWithMessages {
  friend: User;
  messages: Message[];
  unreadCount: number;
}

interface FriendRequestWithUser extends Friendship {
  requester: User;
}

export default function MessengerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState<"chats" | "contacts" | "requests" | "settings" | "admin">("chats");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [addFriendDialogOpen, setAddFriendDialogOpen] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const { data: friends = [] } = useQuery<User[]>({
    queryKey: ["/api/friends"],
  });

  const { data: friendRequests = [] } = useQuery<FriendRequestWithUser[]>({
    queryKey: ["/api/friends/requests"],
  });

  const { data: allMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", { receiverId, content });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/friends/accept/${requestId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request accepted!",
        description: "You are now friends.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const declineFriendMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/friends/decline/${requestId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request declined",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      socket.send(JSON.stringify({ type: "auth", userId: user.id }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        if (data.senderId !== selectedFriendId) {
          toast({
            title: "New message",
            description: `${data.senderUsername}: ${data.content.substring(0, 50)}${data.content.length > 50 ? "..." : ""}`,
          });
        }
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user?.id]);

  const friendsWithMessages: FriendWithMessages[] = friends.map((friend) => {
    const friendMessages = allMessages.filter(
      (msg) =>
        (msg.senderId === user?.id && msg.receiverId === friend.id) ||
        (msg.senderId === friend.id && msg.receiverId === user?.id)
    );
    const sortedMessages = [...friendMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const unreadCount = friendMessages.filter(
      (msg) => msg.senderId === friend.id && !msg.isRead
    ).length;

    return {
      friend,
      messages: sortedMessages,
      unreadCount,
    };
  });

  const conversations = friendsWithMessages
    .filter((fwm) => fwm.messages.length > 0)
    .sort((a, b) => {
      const aLastMsg = a.messages[a.messages.length - 1];
      const bLastMsg = b.messages[b.messages.length - 1];
      return new Date(bLastMsg.createdAt).getTime() - new Date(aLastMsg.createdAt).getTime();
    })
    .map((fwm) => ({
      friend: fwm.friend,
      lastMessage: fwm.messages[fwm.messages.length - 1],
      unreadCount: fwm.unreadCount,
    }));

  const selectedFriendData = friendsWithMessages.find((fwm) => fwm.friend.id === selectedFriendId);
  const selectedFriend = selectedFriendData?.friend || null;
  const selectedMessages = selectedFriendData?.messages || [];

  const handleSendMessage = (content: string) => {
    if (selectedFriendId && user) {
      sendMessageMutation.mutate({ receiverId: selectedFriendId, content });
    }
  };

  const handleStartChat = (friendId: string) => {
    setSelectedFriendId(friendId);
    setActiveView("chats");
  };

  const existingFriendIds = [
    ...friends.map((f) => f.id),
    ...friendRequests.map((r) => r.userId),
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <UserSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        pendingRequestsCount={friendRequests.length}
      />

      {activeView === "chats" && (
        <>
          <ConversationList
            conversations={conversations}
            selectedFriendId={selectedFriendId}
            onSelectConversation={setSelectedFriendId}
            currentUserId={user?.id || ""}
          />
          <ChatArea
            friend={selectedFriend}
            messages={selectedMessages}
            onSendMessage={handleSendMessage}
            isSending={sendMessageMutation.isPending}
          />
        </>
      )}

      {activeView === "contacts" && (
        <ContactsList
          contacts={friends}
          onStartChat={handleStartChat}
          onAddFriendClick={() => setAddFriendDialogOpen(true)}
        />
      )}

      {activeView === "requests" && (
        <FriendRequests
          requests={friendRequests}
          onAccept={(id) => acceptFriendMutation.mutate(id)}
          onDecline={(id) => declineFriendMutation.mutate(id)}
          isLoading={acceptFriendMutation.isPending || declineFriendMutation.isPending}
        />
      )}

      {activeView === "settings" && <SettingsPage />}

      {activeView === "admin" && user?.isAdmin && <AdminPage />}

      <AddFriendDialog
        open={addFriendDialogOpen}
        onOpenChange={setAddFriendDialogOpen}
        currentUserId={user?.id || ""}
        existingFriendIds={existingFriendIds}
      />
    </div>
  );
}
