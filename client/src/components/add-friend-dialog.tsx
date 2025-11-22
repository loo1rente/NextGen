import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, Check } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@shared/schema";

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  existingFriendIds: string[];
}

export function AddFriendDialog({ open, onOpenChange, currentUserId, existingFriendIds }: AddFriendDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: searchResults = [], isLoading } = useQuery<User[]>({
    queryKey: [`/api/users/search?q=${searchQuery}`],
    enabled: searchQuery.length >= 2 && open,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await apiRequest("POST", "/api/friends/request", { friendId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request sent!",
        description: "Your request has been sent successfully.",
      });
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&size=128`;
  };

  const filteredResults = searchResults.filter(
    (user) => user.id !== currentUserId && !existingFriendIds.includes(user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>Search for users by username to send them a friend request.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by username..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              data-testid="input-search-users"
            />
          </div>

          <ScrollArea className="h-80">
            {searchQuery.length < 2 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((user) => {
                  const alreadySent = existingFriendIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-md hover-elevate active-elevate-2"
                    >
                      <Avatar className="h-10 w-10">
                        <img src={getAvatarUrl(user.username)} alt={user.username} />
                        <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" data-testid={`text-user-${user.id}`}>
                          {user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.status === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addFriendMutation.mutate(user.id)}
                        disabled={addFriendMutation.isPending || alreadySent}
                        className="gap-2"
                        data-testid={`button-add-${user.id}`}
                      >
                        {alreadySent ? (
                          <>
                            <Check className="h-4 w-4" />
                            Sent
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
