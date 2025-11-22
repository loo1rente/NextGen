import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
}: CreateGroupDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/groups", {
        name: groupName.trim(),
        description: description.trim() || undefined,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create group");
      }

      await res.json();

      toast({
        title: "Success",
        description: `Group "${groupName}" created successfully!`,
      });

      // Invalidate groups query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });

      // Reset form and close dialog
      setGroupName("");
      setDescription("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("messenger.newGroup")}</DialogTitle>
          <DialogDescription>
            {t("messenger.groupName")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">{t("messenger.groupName")}</Label>
            <Input
              id="group-name"
              placeholder={t("messenger.groupNamePlaceholder")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={isLoading}
              data-testid="input-group-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Input
              id="group-description"
              placeholder="Enter group description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              data-testid="input-group-description"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              data-testid="button-cancel-group"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="button-submit-group"
            >
              {isLoading ? "Creating..." : t("messenger.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
