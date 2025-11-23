import { users, friendships, messages, groups, groupMembers, notifications, typingStatus, messageReactions, blockedUsers, type User, type InsertUser, type Friendship, type InsertFriendship, type Message, type InsertMessage, type Group, type InsertGroup, type GroupMember, type Notification, type InsertNotification, type MessageReaction, type BlockedUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike, like, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;
  
  searchUsers(query: string, limit?: number): Promise<User[]>;
  
  getFriendships(userId: string): Promise<Friendship[]>;
  getFriendship(userId: string, friendId: string): Promise<Friendship | undefined>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendshipStatus(id: string, status: string): Promise<Friendship>;
  deleteFriendship(id: string): Promise<void>;
  getPendingRequests(userId: string): Promise<Friendship[]>;
  
  getMessages(userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(senderId: string, receiverId: string): Promise<void>;
  searchMessages(query: string, userId?: string, limit?: number): Promise<Message[]>;
  
  getGroups(userId: string): Promise<Group[]>;
  getGroup(groupId: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  addGroupMember(groupId: string, userId: string): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  getGroupMessages(groupId: string): Promise<Message[]>;
  
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  
  deleteMessage(messageId: string): Promise<void>;
  editMessage(messageId: string, content: string): Promise<Message>;
  markMessageAsDelivered(messageId: string): Promise<void>;
  
  addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>;
  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>;
  getMessageReactions(messageId: string): Promise<MessageReaction[]>;
  
  blockUser(userId: string, blockedUserId: string): Promise<BlockedUser>;
  unblockUser(userId: string, blockedUserId: string): Promise<void>;
  isUserBlocked(userId: string, targetUserId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status, lastSeen: new Date() })
      .where(eq(users.id, id));
  }

  async searchUsers(query: string, limit: number = 100): Promise<User[]> {
    // If query is empty, return all users
    if (!query || query.length === 0) {
      const results = await db
        .select()
        .from(users)
        .limit(limit);
      return results;
    }
    
    const escapedQuery = query.replace(/[_%\\]/g, '\\$&');
    const results = await db
      .select()
      .from(users)
      .where(ilike(users.username, `%${escapedQuery}%`))
      .limit(limit);
    return results;
  }

  async getFriendships(userId: string): Promise<Friendship[]> {
    const results = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.userId, userId),
            eq(friendships.friendId, userId)
          ),
          eq(friendships.status, "accepted")
        )
      );
    return results;
  }

  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
    return friendship || undefined;
  }

  async createFriendship(insertFriendship: InsertFriendship): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values(insertFriendship)
      .returning();
    return friendship;
  }

  async updateFriendshipStatus(id: string, status: string): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({ status })
      .where(eq(friendships.id, id))
      .returning();
    return friendship;
  }

  async deleteFriendship(id: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, id));
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    const results = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, "pending")
        )
      );
    return results;
  }

  async getMessages(userId: string): Promise<Message[]> {
    // Get direct messages with user
    const directMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      );

    // Get group messages from groups user is member of
    const userGroups = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = userGroups.map(gm => gm.groupId);
    
    let groupMessages: Message[] = [];
    if (groupIds.length > 0) {
      groupMessages = await db
        .select()
        .from(messages)
        .where(sql`${messages.groupId} = ANY(ARRAY[${sql.join(groupIds.map(id => sql`${id}`), sql`,`)}])`);
    }

    // Combine and sort by date
    const allMessages = [...directMessages, ...groupMessages];
    return allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.isRead, false)
        )
      );
  }

  async getAllUsers(): Promise<User[]> {
    const results = await db.select().from(users);
    return results;
  }

  async banUser(id: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isBanned: true })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async unbanUser(id: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isBanned: false })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserProfile(id: string, displayName: string | null, username: string, avatarUrl?: string): Promise<User> {
    const updateData: any = { displayName: displayName || null, username };
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async searchMessages(query: string, userId?: string, limit: number = 20): Promise<Message[]> {
    const escapedQuery = query.replace(/[_%\\]/g, '\\$&');
    
    let conditions: any[] = [like(messages.content, `%${escapedQuery}%`)];
    if (userId) {
      conditions.push(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));
    }
    
    const results = await db
      .select()
      .from(messages)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return results;
  }

  async getGroups(userId: string): Promise<Group[]> {
    const userGroups = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = userGroups.map(gm => gm.groupId);
    if (groupIds.length === 0) return [];
    
    const results = await db.select().from(groups).where(inArray(groups.id, groupIds));
    return results;
  }

  async getGroup(groupId: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    return group || undefined;
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db.insert(groups).values(insertGroup).returning();
    return group;
  }

  async addGroupMember(groupId: string, userId: string): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values({ groupId, userId }).returning();
    return member;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const results = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
    return results;
  }

  async getGroupMessages(groupId: string): Promise<Message[]> {
    const results = await db.select().from(messages).where(eq(messages.groupId, groupId)).orderBy(desc(messages.createdAt));
    return results;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const results = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    return results;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const [notification] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId)).returning();
    return notification;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, messageId));
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    const [message] = await db.update(messages).set({ content, editedAt: new Date() }).where(eq(messages.id, messageId)).returning();
    return message;
  }

  async markMessageAsDelivered(messageId: string): Promise<void> {
    await db.update(messages).set({ isDelivered: true }).where(eq(messages.id, messageId));
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const [reaction] = await db.insert(messageReactions).values({ messageId, userId, emoji }).returning();
    return reaction;
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(messageReactions).where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji)));
  }

  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const results = await db.select().from(messageReactions).where(eq(messageReactions.messageId, messageId));
    return results;
  }

  async blockUser(userId: string, blockedUserId: string): Promise<BlockedUser> {
    const [block] = await db.insert(blockedUsers).values({ userId, blockedUserId }).returning();
    return block;
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await db.delete(blockedUsers).where(and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId)));
  }

  async isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const [block] = await db.select().from(blockedUsers).where(and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, targetUserId)));
    return !!block;
  }
}

export const storage = new DatabaseStorage();
