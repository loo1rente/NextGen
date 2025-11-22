# NextGen Messenger - Design Guidelines

## Design Approach
**Reference-Based: Telegram Desktop & Mobile**
This messaging application draws inspiration from Telegram's clean, functional interface optimized for communication efficiency. The design prioritizes information density, quick navigation, and distraction-free messaging.

## Typography System

**Font Stack:**
- Primary: Inter (Google Fonts) for UI elements and messages
- Monospace: JetBrains Mono for timestamps and metadata

**Hierarchy:**
- Chat names: font-semibold text-base
- Message text: font-normal text-sm
- Timestamps: font-normal text-xs
- Section headers: font-semibold text-lg
- Button labels: font-medium text-sm

## Layout System

**Spacing Primitives:**
Use Tailwind units: 2, 3, 4, 6, 8 for consistency (p-2, m-4, gap-6, h-8, etc.)

**Core Layout Structure:**

**Desktop (≥1024px):**
- Three-column layout: Sidebar (280px) | Conversation List (360px) | Chat Area (flex-1)
- Sidebar: Fixed width, contains user profile and navigation
- Conversation List: Scrollable list of chats with preview
- Chat Area: Messages with input at bottom

**Tablet (768px-1023px):**
- Two-column: Conversation List (320px) | Chat Area (flex-1)
- Sidebar collapses into hamburger menu
- Swipe gestures to reveal sidebar

**Mobile (<768px):**
- Single-column stack with navigation states
- Full-screen conversation list OR full-screen chat (toggle between)
- Bottom navigation bar with key actions

## Component Library

### Navigation & Sidebar
**User Profile Section:**
- Avatar (48px circle) with online status indicator (8px dot, absolute positioned)
- Username below avatar (text-sm font-semibold)
- Settings icon (20px) in top-right

**Navigation Menu:**
- List items with icons (24px) + labels
- States: default, hover, active with subtle background shifts
- Items: Chats, Contacts, Friend Requests (with badge counter), Settings

### Conversation List
**Chat Item:**
- Avatar (40px circle) with online indicator
- Two-line layout: Name + last message preview
- Timestamp (text-xs) aligned right
- Unread badge (rounded-full, px-2, text-xs) for message count
- Padding: p-3, gap-3 between elements

**Search Bar:**
- Sticky at top, h-12
- Icon (20px) + input field (text-sm)
- Rounded corners (rounded-lg)

### Chat Interface
**Header:**
- Fixed at top, h-16
- Avatar (36px) + Name + Online Status
- Action icons: Call, Video, More (24px each, gap-4)

**Message Container:**
- Scrollable area with flex-1
- Messages alternate alignment (sent: right, received: left)
- Max-width: 65% of container for readability

**Message Bubble:**
- Padding: px-4 py-2
- Border radius: rounded-2xl (more rounded on sender side)
- Sent messages: rounded-br-sm for tail effect
- Received messages: rounded-bl-sm for tail effect
- Shadow: subtle (shadow-sm)
- Spacing between messages: mb-2, mb-4 for different senders

**Message Content:**
- Text: text-sm, line-height relaxed
- Timestamp: text-xs, mt-1, opacity-75
- Read receipts: Double checkmark icon (14px) next to timestamp

**Input Area:**
- Fixed at bottom, h-16
- Flex layout: Attachment icon | Input field (flex-1) | Send button
- Input: rounded-full, px-4, text-sm
- Icons: 24px with p-2 touch targets

### Friend System Components
**Friend Request Card:**
- Padding: p-4
- Avatar (48px) + Username + mutual friends count
- Action buttons: Accept (px-6 py-2) / Decline (px-4 py-2)
- Horizontal layout with gap-4

**Add Friend Modal:**
- Centered overlay (max-w-md)
- Search input at top
- Results list below with user cards
- Each card: Avatar + Username + "Add Friend" button

### Modals & Overlays
**Standard Modal:**
- Backdrop: opacity-50
- Container: max-w-lg, rounded-2xl, p-6
- Header: text-lg font-semibold, mb-4
- Actions: Flex row with gap-3, justify-end

**Toast Notifications:**
- Fixed bottom-right, max-w-sm
- Padding: p-4, rounded-lg, shadow-lg
- Icon (20px) + Message (text-sm)
- Auto-dismiss after 3s with slide-in/out animation

## Responsive Breakpoints
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1023px (two columns, collapsible sidebar)
- Desktop: ≥ 1024px (three columns, persistent sidebar)

## Interaction Patterns

**Animations:**
Use sparingly for polish only:
- Message send: subtle fade-in (150ms)
- New message notification: gentle bounce on conversation item
- Modal entrance: scale from 0.95 to 1 (200ms)
- No decorative animations

**Touch Targets:**
Minimum 44px (h-11 or p-2 on 24px icons) for mobile accessibility

**Loading States:**
- Skeleton screens for conversation list
- Inline spinners (16px) for message sending
- Pulse animation on loading avatars

## Accessibility
- Focus rings on all interactive elements (ring-2 ring-offset-2)
- ARIA labels on icon-only buttons
- Keyboard navigation: Tab through chats, Enter to open, Esc to close modals
- Screen reader announcements for new messages

## Images
This is a messaging application - no hero images needed. User avatars are the primary visual elements. Use placeholder avatar services (like ui-avatars.com) for users without custom avatars, showing first letter of username.