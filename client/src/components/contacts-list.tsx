import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UserPlus, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { AvatarDisplay } from "@/components/avatar-display";
import type { User } from "@shared/schema";

interface ContactsListProps {
  contacts: User[];
  onStartChat: (friendId: string) => void;
  onAddFriendClick: () => void;
}

export function ContactsList({ contacts, onStartChat, onAddFriendClick }: ContactsListProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");


  const filteredContacts = contacts.filter((contact) =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">{t('messenger.contacts')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {contacts.length} {contacts.length !== 1 ? t('messenger.contactsCount') : t('messenger.contactCount')}
            </p>
          </div>
          <Button onClick={onAddFriendClick} className="gap-2" data-testid="button-add-friend">
            <UserPlus className="h-4 w-4" />
            {t('messenger.addFriend')}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('messenger.searchContacts')}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-contacts"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredContacts.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? t('messenger.noContacts') : t('messenger.noContacts')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search" : t('messenger.noContactsDesc')}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="p-4 border border-card-border hover:shadow-md transition-all hover-elevate">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <AvatarDisplay 
                      username={contact.username} 
                      avatarUrl={contact.avatarUrl}
                      size="lg"
                    />
                    {contact.status === "online" && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-status-online border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" data-testid={`text-contact-${contact.id}`}>
                      {contact.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contact.status === "online" ? t('messenger.online') : t('messenger.offline')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onStartChat(contact.id)}
                    className="gap-2"
                    data-testid={`button-chat-${contact.id}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('messenger.message')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
