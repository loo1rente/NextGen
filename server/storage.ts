import { users, friendships, messages, type User, type InsertUser, type Friendship, type InsertFriendship, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
