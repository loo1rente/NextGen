import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Shield, Ban, Check } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminPage() {
  const { toast } = useToast();
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const banMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/ban`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User banned",
        description: "The user has been successfully banned.",
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

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/unban`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User unbanned",
        description: "The user has been successfully unbanned.",
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

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (username: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff&size=128`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage users and control access</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            users.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <img src={getAvatarUrl(user.username)} alt={user.username} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm" data-testid={`text-user-${user.id}`}>
                        {user.displayName || user.username}
                      </p>
                      {user.isAdmin && (
                        <Badge variant="default" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={user.isBanned ? "destructive" : "secondary"}
                      data-testid={`badge-status-${user.id}`}
                    >
                      {user.isBanned ? "Banned" : "Active"}
                    </Badge>

                    {user.isBanned ? (
                      <Button
                        size="sm"
                        onClick={() => unbanMutation.mutate(user.id)}
                        disabled={unbanMutation.isPending}
                        className="gap-2"
                        data-testid={`button-unban-${user.id}`}
                      >
                        <Check className="h-4 w-4" />
                        Unban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => banMutation.mutate(user.id)}
                        disabled={banMutation.isPending}
                        className="gap-2"
                        data-testid={`button-ban-${user.id}`}
                      >
                        <Ban className="h-4 w-4" />
                        Ban
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
