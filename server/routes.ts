import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema } from "@shared/schema";
import bcrypt from "bcrypt";

const connectedUsers = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });

      (req.session as any).userId = user.id;
      await storage.updateUserStatus(user.id, "online");

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      (req.session as any).userId = user.id;
      await storage.updateUserStatus(user.id, "online");

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const userId = (req.session as any).userId;
    if (userId) {
      await storage.updateUserStatus(userId, "offline");
    }
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const users = await storage.searchUsers(query);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Search failed" });
    }
  });

  app.get("/api/friends", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const friendships = await storage.getFriendships(userId);
      const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);
      
      const friends = await Promise.all(
        friendIds.map(async (id) => {
          const user = await storage.getUser(id);
          if (!user) return null;
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );

      res.json(friends.filter(f => f !== null));
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch friends" });
    }
  });

  app.post("/api/friends/request", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { friendId } = req.body;
      if (!friendId) {
        return res.status(400).json({ message: "Friend ID is required" });
      }

      if (userId === friendId) {
        return res.status(400).json({ message: "Cannot add yourself as a friend" });
      }

      const existingFriendship = await storage.getFriendship(userId, friendId);
      if (existingFriendship) {
        return res.status(400).json({ message: "Friendship already exists" });
      }

      const friendship = await storage.createFriendship({
        userId,
        friendId,
      });

      res.json(friendship);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to send friend request" });
    }
  });

  app.get("/api/friends/requests", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const requests = await storage.getPendingRequests(userId);
      
      const requestsWithUsers = await Promise.all(
        requests.map(async (request) => {
          const requester = await storage.getUser(request.userId);
          if (!requester) return null;
          const { password, ...requesterWithoutPassword } = requester;
          return {
            ...request,
            requester: requesterWithoutPassword,
          };
        })
      );

      res.json(requestsWithUsers.filter(r => r !== null));
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch friend requests" });
    }
  });

  app.post("/api/friends/accept/:requestId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { requestId } = req.params;
      const friendship = await storage.updateFriendshipStatus(requestId, "accepted");
      
      res.json(friendship);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to accept friend request" });
    }
  });

  app.post("/api/friends/decline/:requestId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { requestId } = req.params;
      await storage.deleteFriendship(requestId);
      
      res.json({ message: "Friend request declined" });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to decline friend request" });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const messages = await storage.getMessages(userId);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { receiverId, groupId, content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      if (!receiverId && !groupId) {
        return res.status(400).json({ message: "Either receiver ID or group ID is required" });
      }

      // Handle group messages
      if (groupId) {
        const groupMembers = await storage.getGroupMembers(groupId);
        const isMember = groupMembers.some(gm => gm.userId === userId);
        if (!isMember) {
          return res.status(403).json({ message: "You are not a member of this group" });
        }

        const message = await storage.createMessage({
          senderId: userId,
          groupId,
          content,
        });

        // Broadcast to all group members
        const allMembers = await storage.getGroupMembers(groupId);
        const sender = await storage.getUser(userId);
        
        allMembers.forEach(member => {
          const memberWs = connectedUsers.get(member.userId);
          if (memberWs && memberWs.readyState === WebSocket.OPEN) {
            memberWs.send(JSON.stringify({
              type: "new_message",
              message,
              senderId: userId,
              senderUsername: sender?.username,
              groupId,
              content,
            }));
          }
        });

        res.json(message);
        return;
      }

      // Handle direct messages
      const areFriends = await storage.getFriendship(userId, receiverId!);
      if (!areFriends || areFriends.status !== "accepted") {
        return res.status(403).json({ message: "You can only message friends" });
      }

      const message = await storage.createMessage({
        senderId: userId,
        receiverId,
        content,
      });

      const receiverWs = connectedUsers.get(receiverId!);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        const sender = await storage.getUser(userId);
        receiverWs.send(JSON.stringify({
          type: "new_message",
          message,
          senderId: userId,
          senderUsername: sender?.username,
          content,
        }));
      }

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to send message" });
    }
  });

  app.post("/api/auth/profile", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { displayName, username, avatarUrl } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.updateUserProfile(userId, displayName || null, username, avatarUrl);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:userId/ban", async (req, res) => {
    try {
      const adminUserId = (req.session as any).userId;
      if (!adminUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminUserId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const user = await storage.banUser(userId);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to ban user" });
    }
  });

  app.post("/api/admin/users/:userId/unban", async (req, res) => {
    try {
      const adminUserId = (req.session as any).userId;
      if (!adminUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminUserId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const user = await storage.unbanUser(userId);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to unban user" });
    }
  });

  app.get("/api/messages/search", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query required" });
      }

      const results = await storage.searchMessages(q, userId, 50);
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Search failed" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Group name required" });
      }

      const group = await storage.createGroup({ name, description, createdBy: userId });
      await storage.addGroupMember(group.id, userId);
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create group" });
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const groups = await storage.getGroups(userId);
      res.json(groups);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch groups" });
    }
  });

  app.get("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch group" });
    }
  });

  app.get("/api/groups/:groupId/members-info", async (req, res) => {
    try {
      const { groupId } = req.params;
      const members = await storage.getGroupMembers(groupId);
      const memberIds = members.map(m => m.userId);
      
      const memberUsers = await Promise.all(
        memberIds.map(async (id) => {
          const user = await storage.getUser(id);
          if (!user) return null;
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      );

      res.json(memberUsers.filter(m => m !== null));
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch group members" });
    }
  });

  app.get("/api/groups/:groupId/messages", async (req, res) => {
    try {
      const { groupId } = req.params;
      const messages = await storage.getGroupMessages(groupId);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  app.post("/api/groups/:groupId/members", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { groupId } = req.params;
      const { memberId } = req.body;
      if (!memberId) {
        return res.status(400).json({ message: "Member ID required" });
      }

      const member = await storage.addGroupMember(groupId, memberId);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add member" });
    }
  });

  app.delete("/api/groups/:groupId/members/:memberId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { groupId, memberId } = req.params;
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Only group creator can remove members
      if (group.createdBy !== userId) {
        return res.status(403).json({ message: "Only group creator can remove members" });
      }

      await storage.removeGroupMember(groupId, memberId);
      res.json({ message: "Member removed" });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to remove member" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      const { notificationId } = req.params;
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to mark notification as read" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let userId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth' && message.userId) {
          userId = message.userId;
          connectedUsers.set(userId, ws);
          if (userId) {
            await storage.updateUserStatus(userId, "online");
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (userId) {
        connectedUsers.delete(userId);
        await storage.updateUserStatus(userId, "offline");
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
