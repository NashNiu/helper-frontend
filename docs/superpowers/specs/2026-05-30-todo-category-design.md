# Todo Category Design Spec

**Date:** 2026-05-30  
**Status:** Approved

---

## Overview

Add a dedicated, flat category system for todos. Categories are independent of the existing finance category system. When creating a todo the user can optionally pick one category; the default is no category. The todo list supports filtering by category. Categories are managed inline (create / delete) from within the todo page.

---

## Data Model

### New table: `todo_category`

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK auto-increment | |
| `user_id` | int (indexed) | FK to user, scoped per user |
| `name` | varchar | required, max 50 chars |
| `created_at` | timestamp | auto |

No hierarchy — flat list only.

### Modified table: `todo`

Add column `category_id int nullable` — foreign key → `todo_category.id`, ON DELETE SET NULL.

---

## Backend

### New module: `todo-category`

**Entity:** `TodoCategory` with fields above, ManyToOne to User.

**Controller:** all routes under `/api/todo-categories`, guarded by `JwtAuthGuard`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/todo-categories` | Return all categories for the current user |
| POST | `/api/todo-categories` | Create a new category (`{ name }`) |
| DELETE | `/api/todo-categories/:id` | Delete a category (only owner can delete) |

**CreateTodoCategoryDto:** `name` — required string, not empty, max 50 chars.

Deleting a category sets `category_id` to NULL on all affected todos (handled by ON DELETE SET NULL in the FK definition).

### Modified module: `todo`

**`Todo` entity:** add `category_id` nullable integer column + `ManyToOne` relation to `TodoCategory` (eager: false, nullable, onDelete: 'SET NULL').

**`CreateTodoDto`:** add optional `category_id?: number`.

**`TodoService.create()`:** accept and persist `category_id`.

**`TodoService.findAll()`:** join `category` relation so each todo response includes `{ category: { id, name } | null }`.

**Migration:** new migration file that (1) creates `todo_category` table, (2) adds `category_id` nullable FK column on `todo`.

---

## Frontend

### New file: `src/api/todoCategory.ts`

```typescript
export interface TodoCategory {
  id: number;
  name: string;
}

export const todoCategoryApi = {
  getAll: (): Promise<TodoCategory[]> => http.get('/todo-categories'),
  create: (name: string): Promise<TodoCategory> => http.post('/todo-categories', { name }),
  remove: (id: number): Promise<void> => http.delete(`/todo-categories/${id}`),
};
```

### Modified: `src/api/todo.ts`

Add `category: { id: number; name: string } | null` to the `Todo` interface.  
Update `create(content, files, categoryId?: number)` to include `category_id` in the FormData payload when provided.

### Modified: `src/pages/TodoPage.tsx`

**State additions:**
- `categories: TodoCategory[]` — fetched on mount, refreshed after create/delete
- `selectedCategoryId: number | null` — category chosen for the next new todo (default null)
- `filterCategoryId: number | null | 'none'` — active filter (`null` = all, `'none'` = no-category, `number` = specific category)
- `managingCategories: boolean` — whether the management panel is open

**Layout (top to bottom inside the create card):**

1. Existing input row (text + 📷 + 添加 button) — unchanged
2. **Category tag bar** (new, below input row):
   - Chips: `[无]` + one chip per category + `[＋]` button
   - Clicking a chip sets `selectedCategoryId`; clicking the active chip sets it back to null
   - `[＋]` opens the management panel (`managingCategories = true`)
   - Selected chip is highlighted (blue border + text)
   - "无" chip is highlighted when `selectedCategoryId === null`

3. **Management panel** (shown when `managingCategories === true`, replaces tag bar):
   - All existing categories shown as chips with `×` delete button
   - New category input field + 添加 button + 关闭 button
   - Clicking `×` calls `todoCategoryApi.remove(id)`, refreshes categories, clears `selectedCategoryId` if the deleted category was selected
   - 关闭 hides the panel

**Filter bar** (new, between create card and todo list):
- Chips: `[全部]` + `[无分类]` + one chip per category
- Clicking sets `filterCategoryId`
- Front-end only filtering — no new API call

**Filtered list computation** (derived from `todos` state):
```
if filterCategoryId === null        → show all
if filterCategoryId === 'none'      → show todos where category === null
if filterCategoryId is a number     → show todos where category.id === filterCategoryId
```

**Todo list item** (existing item, minor addition):
- If `todo.category` is set, show a small colored badge to the right of the content text
- Badge uses a consistent color derived from the category id (cycle through a small palette)
- No badge if `category === null`

**Create flow:**
- `handleCreate()` passes `selectedCategoryId ?? undefined` as `categoryId` to `todoApi.create()`
- After successful create, reset `selectedCategoryId` to null

---

## Behavior Details

- **No built-in categories** — user starts with an empty list; the category bar shows only `[无]` + `[＋]` until they add categories
- **Category color** — small badge on list items uses a palette of ~6 soft colors cycled by `category.id % 6`; always same color for same category within a session
- **Delete protection** — none needed; all categories are user-created
- **Filter persistence** — filter resets to "全部" on page navigation away
- **Empty filter result** — if the filtered list is empty, show the standard empty-state message

---

## Out of Scope

- Editing (renaming) a category
- Assigning multiple categories to one todo
- Reordering categories
- Category usage count
- Sub-categories / hierarchy
