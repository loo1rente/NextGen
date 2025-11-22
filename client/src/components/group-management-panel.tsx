import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { AvatarDisplay } from "@/components/avatar-display";
import { X, Plus, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";

interface GroupManagementPanelProps {
  groupId: string;
  groupName: string;
  isCreator: boolean;
  onClose: () => void;
}

export function GroupManagementPanel({
  groupId,
  groupName,
  isCreator,
  onClose,
}: GroupManagementPanelProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);

  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/groups", groupId, "members"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}/members-info`, {});
      return res.json();
    },
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/search?q=", {});
      return res.json();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest("DELETE", `/api/groups/${groupId}/members/${memberId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      toast({
        title: "Success",
        description: "Member removed",
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

  const addMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/members`, { memberId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      setSelectedMembersToAdd([]);
      toast({
        title: "Success",
        description: "Member added",
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

  const memberIds = new Set(members.map(m => m.id));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <div className="w-80 border-l border-border flex flex-col h-full bg-card">
      <div className="h-16 border-b border-border px-4 flex items-center justify-between shrink-0">
        <div>
          <p className="font-semibold text-sm">{groupName}</p>
          <p className="text-xs text-muted-foreground">{members.length} {t("messenger.members")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-group-panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              {t("messenger.members")} ({members.length})
            </p>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AvatarDisplay
                      username={member.username}
                      avatarUrl={member.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.username}</p>
                      <p className="text-xs text-muted-foreground">{member.status}</p>
                    </div>
                  </div>
                  {isCreator && member.id !== groupId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                      disabled={removeMemberMutation.isPending}
                      data-testid={`button-remove-member-${member.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isCreator && nonMembers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                {t("messenger.addMembers")}
              </p>
              <div className="space-y-2">
                {nonMembers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarDisplay
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        size="sm"
                      />
                      <p className="text-sm font-medium truncate">{user.username}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => addMemberMutation.mutate(user.id)}
                      disabled={addMemberMutation.isPending}
                      data-testid={`button-add-member-${user.id}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
