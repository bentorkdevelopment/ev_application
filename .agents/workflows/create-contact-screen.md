---
description: Contact Screen
---

---
description:
---

# Workflow: Create Contact Screen (User Directory)

## Trigger

`/create_contacts`

---

## Objective

Build a **Contact Screen** that serves as a unified directory of users, enabling seamless discovery, communication initiation, and profile viewing.

The Contact Screen MUST remain in disciplined alignment with the core ecosystem UI system (Finance app reference), preserving visual harmony across the suite.

---

## Dependencies

- User Database / Backend API (source of contacts)
- Ecosystem UI Rules (Finance app as design reference)

---

## Inputs

- `user_contacts` (fetched from backend)  
- optional: `search_query`  
- optional: `filters` (favorites, recent, etc.)

---

## Rules

- Follow `ecosystem_rules.md` strictly  
- Maintain same UI components as Finance app  
- Reuse card layouts, spacing, typography  
- Do NOT introduce new UI patterns or visual deviations  

---

## Steps

### 1. Fetch Contacts

Retrieve all user contacts from backend.

Include:
- Name  
- Phone / Email  
- Profile Image  
- Status (online/offline if available)  

---

### 2. Normalize Contact Data

Structure data into a consistent format:

- `id`  
- `name`  
- `avatar`  
- `contact_info`  
- `status`  
- `last_interaction` (optional)  

---

### 3. Categorize Contacts

Organize contacts into meaningful groups:

- Favorites  
- Recent Contacts  
- All Contacts (alphabetically sorted)  

Ensure:
- Smooth grouping logic  
- Stable sorting (A–Z consistency)  

---

### 4. Build Contact UI

#### A. Contact List Screen

- Display scrollable list of contacts  
- Grouped sections (if applicable)  
- Sticky headers for sections (optional)  

#### B. Contact Card UI

Each contact must be presented using ecosystem card structure:

- Profile image (left aligned)  
- Name (primary text)  
- Secondary info (phone/email or status)  
- Optional status indicator  

Maintain:
- Same card spacing (16px grid)  
- Same typography hierarchy  
- Same elevation and border radius  

---

### 5. Search & Filter Layer

- Add search bar at top  
- Enable real-time filtering:
  - By name  
  - By contact info  

Optional filters:
- Favorites toggle  
- Recently contacted  

---

### 6. Interaction Features

- Tap → Open contact details  
- Long press → Show quick actions:
  - Call  
  - Message  
  - Email  

- Swipe (optional):
  - Quick call/message  

---

### 7. Contact Detail Screen

On selection:

Display detailed profile:

- Full name  
- Profile image  
- Contact methods  

Interaction buttons:
- Call  
- Message  
- Email  

Maintain same UI system and spacing discipline  

---

### 8. Add New Contact Action

Floating Action Button (FAB):

→ “Add Contact”

On click:

Open contact creation form  

Fields:
- Name  
- Phone  
- Email  

---

### 9. Handle Edge Cases

- No contacts → Show empty state (Finance app style)  
- Search yields no results → Show graceful fallback  
- Missing avatar → Use default placeholder  
- Duplicate contacts → Merge or flag  

---

### 10. Architecture

- Clean Architecture  
- MVVM  
- Riverpod for state management  

---

### 11. Validation Step (MANDATORY)

- UI matches Finance app design system  
- Card components identical in structure  
- Typography consistent  
- Spacing follows 16px system  
- No visual inconsistencies  

Reject output if any deviation is observed  

---

## Output

Generate:

- Contact Screen UI  
- Contact Card components  
- Search and filtering logic  
- Contact detail screen  
- Add contact flow  
- Backend integration layer  
- State management setup  

---

Ensure the experience feels unified, restrained, and consistent with the broader ecosystem, as though shaped by the same careful hand across every screen.