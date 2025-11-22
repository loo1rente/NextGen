import { users, friendships, messages, groups, groupMembers, notifications, typingStatus, type User, type InsertUser, type Friendship, type InsertFriendship, type Message, type InsertMessage, type Group, type InsertGroup, type GroupMember, type Notification, type InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike, like } from "drizzle-orm";

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

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
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
    const results = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));
    return results;
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
    let q = db.select().from(messages).where(like(messages.content, `%${escapedQuery}%`));
    
    if (userId) {
      q = q.where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));
    }
    
    const results = await q.orderBy(desc(messages.createdAt)).limit(limit);
    return results;
  }

  async getGroups(userId: string): Promise<Group[]> {
    const userGroups = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    const groupIds = userGroups.map(gm => gm.groupId);
    if (groupIds.length === 0) return [];
    
    const results = await db.select().from(groups).where(sql`${groups.id} = ANY(ARRAY[${sql.join(groupIds.map(id => sql`${id}`), sql`,`)}])`);
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
}

export const storage = new DatabaseStorage();
