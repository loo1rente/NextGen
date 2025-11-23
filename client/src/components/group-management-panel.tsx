import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [kickConfirmation, setKickConfirmation] = useState<{ memberId: string; memberName: string } | null>(null);

  const { data: members = [], isLoading: membersLoading, error: membersError } = useQuery<User[]>({
    queryKey: ["/api/groups", groupId, "members"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/groups/${groupId}/members-info`, {});
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: friends = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/friends"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/friends");
      return res.json();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest("DELETE", `/api/groups/${groupId}/members/${memberId}`, {});
      if (!res.ok) throw new Error("Failed to remove member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      setKickConfirmation(null);
      toast({
        title: "Success",
        description: "Member kicked from group",
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
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
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
  const nonMembers = friends.filter(u => !memberIds.has(u.id));

  return (
    <div className="hidden lg:flex lg:w-80 border-l border-border flex-col h-full bg-card">
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
          {membersLoading ? (
            <p className="text-xs text-muted-foreground px-2">{t('messenger.loading')}</p>
          ) : (
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
                    {isCreator && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setKickConfirmation({ memberId: member.id, memberName: member.username })}
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-member-${member.id}`}
                        title="Kick member from group"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isCreator && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                {t("messenger.addMembers")}
              </p>
              {usersError ? (
                <p className="text-xs text-red-600 dark:text-red-400 px-2">Error loading friends. Please try refreshing.</p>
              ) : usersLoading ? (
                <p className="text-xs text-muted-foreground px-2">{t('messenger.loading')}</p>
              ) : friends.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2">No friends to add</p>
              ) : nonMembers.length > 0 ? (
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
              ) : (
                <p className="text-xs text-muted-foreground px-2">All users are already members</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {kickConfirmation && (
        <AlertDialog open={!!kickConfirmation} onOpenChange={(open) => !open && setKickConfirmation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kick member from group?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to kick {kickConfirmation.memberName} from {groupName}? They will no longer have access to the group.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeMemberMutation.mutate(kickConfirmation.memberId)}
                disabled={removeMemberMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                Kick member
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
