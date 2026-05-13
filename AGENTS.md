# AGENTS.md

This document provides rules and guidelines for AI agents working on this codebase. Follow these conventions strictly to maintain consistency.
You can summarize this file if you wish.

---

## Project Structure

```
src/
├── api/                 # React Query hooks ONLY
├── assets/              # Static files (images, fonts)
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Spinner, Table)
│   ├── forms/           # Form components (Input, Select, DatePicker)
│   ├── modals/          # Modal content components
│   └── layout/          # Layout components (Header, Footer, Sidebar)
├── constants/           # App constants
├── hooks/               # Utility hooks (NO API calls)
├── lib/                 # Third-party configs (axios, queryClient)
├── pages/               # Route entry points
├── stores/              # Zustand stores
├── styles/              # Global CSS and variables
└── types/               # TypeScript type definitions
```

### Where to Put Things

| What                     | Where                | Example                             |
| ------------------------ | -------------------- | ----------------------------------- |
| React Query hooks        | `api/`               | `api/useUsers.ts`                   |
| Axios instance           | `lib/axios.ts`       | -                                   |
| Query client config      | `lib/queryClient.ts` | -                                   |
| Reusable UI components   | `components/ui/`     | `components/ui/Button/`             |
| Form components          | `components/forms/`  | `components/forms/Input/`           |
| Modal content            | `components/modals/` | `components/modals/ConfirmModal/`   |
| Layout components        | `components/layout/` | `components/layout/Header/`         |
| Page-specific components | Colocate with page   | `pages/Dashboard/DashboardCard.tsx` |
| Utility hooks            | `hooks/`             | `hooks/useScrollToTop.ts`           |
| Zustand stores           | `stores/`            | `stores/useAuthStore.ts`            |
| Shared types             | `types/`             | `types/auth.ts`                     |
| Constants                | `constants/`         | `constants/api.ts`                  |
| Global styles            | `styles/`            | `styles/variables.css`              |

---

## Naming Conventions

### Files and Folders

| Type        | Convention                    | Example             |
| ----------- | ----------------------------- | ------------------- |
| Components  | PascalCase folder + file      | `Button/Button.tsx` |
| Hooks       | camelCase with `use` prefix   | `useScrollToTop.ts` |
| Stores      | camelCase with `use` prefix   | `useAuthStore.ts`   |
| Types       | camelCase                     | `auth.ts`           |
| Constants   | camelCase                     | `api.ts`            |
| CSS Modules | PascalCase matching component | `Button.module.css` |

### Code

| Type             | Convention                  | Example                         |
| ---------------- | --------------------------- | ------------------------------- |
| Components       | PascalCase                  | `function Button()`             |
| Hooks            | camelCase with `use` prefix | `function useScrollToTop()`     |
| Stores           | camelCase with `use` prefix | `const useAuthStore = create()` |
| Constants        | SCREAMING_SNAKE_CASE        | `const API_ROUTES = {}`         |
| Types/Interfaces | PascalCase                  | `interface UserState {}`        |
| CSS classes      | camelCase                   | `.buttonPrimary`                |

---

## Exports and Imports

### ALWAYS Use Named Exports

```tsx
// ✓ CORRECT
export function Button() { ... }
export const useAuthStore = create(...);
export interface User { ... }

// ✗ WRONG - Never use default exports
export default function Button() { ... }
export default useAuthStore;
```

### Import Order

Maintain this order with blank lines between groups:

```tsx
// 1. React and external libraries
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports (path aliases)
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { api } from '@/lib/axios';
import type { User } from '@/types';

// 3. Relative imports (only for colocated files)
import styles from './Button.module.css';
```

### Path Aliases

ALWAYS use `@/` alias. NEVER use relative paths with `../`:

```tsx
// ✓ CORRECT
import { Button } from '@/components/ui';
import { useUsers } from '@/api';

// ✗ WRONG
import { Button } from '../../../components/ui';
import { useUsers } from '../../api';
```

Exception: Colocated files use relative imports:

```tsx
// ✓ OK for colocated files
import styles from './Button.module.css';
import { ButtonIcon } from './ButtonIcon';
```

### Barrel Files

Create `index.ts` files in these folders:

- `components/ui/index.ts`
- `components/forms/index.ts`
- `components/modals/index.ts`
- `components/layout/index.ts`
- `hooks/index.ts`
- `api/index.ts`
- `stores/index.ts`
- `constants/index.ts` (if folder)

DO NOT create barrel files in:

- `pages/`
- `types/`
- `lib/`

Barrel file format:

```ts
// components/ui/index.ts
export { Button } from './Button/Button';
export { Modal } from './Modal/Modal';
export { Card, CardTitle } from './Card/Card';
export { Spinner } from './Spinner/Spinner';

// components/forms/index.ts
export { Input } from './Input/Input';
export { PasswordEyeInput } from './PasswordEyeInput/PasswordEyeInput';
export { Select } from './Select/Select';
export { DatePicker } from './DatePicker/DatePicker';

// stores/index.ts
export { useAuthStore } from './useAuthStore';
export { useModalStore } from './useModalStore';
export { usePageLayoutStore } from './usePageLayoutStore';
```

---

## Components

### File Structure

Every component gets its own folder with colocated styles:

```
components/ui/Button/
├── Button.tsx
└── Button.module.css
```

For complex components with subcomponents:

```
components/ui/DataTable/
├── DataTable.tsx
├── DataTable.module.css
├── DataTableRow.tsx
└── DataTableHeader.tsx
```

### Component Template

```tsx
// components/ui/Button/Button.tsx
import { type ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', disabled = false, onClick }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
```

### Component Rules

1. Props interface defined above component
2. Destructure props with defaults in function signature
3. Use `ReactNode` for `children` prop
4. Use CSS Modules for styling
5. No inline styles unless dynamic

---

## Styling

### CSS Modules Only

ALWAYS use CSS Modules (`.module.css`). NEVER use:

- Plain CSS files
- Inline styles (except dynamic values)
- CSS-in-JS (styled-components, emotion)
- Tailwind classes

```tsx
// ✓ CORRECT
import styles from './Button.module.css';
<button className={styles.button}>

// ✗ WRONG
<button style={{ padding: '8px' }}>
<button className="btn-primary">
```

### CSS Variables

ALWAYS use CSS variables from `styles/variables.css`. NEVER hardcode values:

```css
/* ✓ CORRECT */
.button {
  background: var(--color-primary);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
}

/* ✗ WRONG */
.button {
  background: #3b82f6;
  padding: 8px 16px;
  border-radius: 8px;
}
```

### Color Usage

Use SEMANTIC colors, not PRIMITIVES:

```css
/* ✓ CORRECT - Semantic */
.error {
  color: var(--color-error);
}
.card {
  background: var(--color-bg);
}

/* ✗ WRONG - Primitives */
.error {
  color: var(--red-500);
}
.card {
  background: var(--gray-100);
}
```

### Available Variables

```css
/* Colors (semantic) */
--color-bg
--color-bg-subtle
--color-bg-muted
--color-text
--color-text-secondary
--color-text-muted
--color-border
--color-primary
--color-primary-hover
--color-error
--color-success
--color-warning

/* Spacing */
--space-xs    /* 4px */
--space-sm    /* 8px */
--space-md    /* 16px */
--space-lg    /* 24px */
--space-xl    /* 32px */

/* Border Radius */
--radius-sm   /* 4px */
--radius-md   /* 8px */
--radius-lg   /* 16px */

/* Z-Index */
--z-dropdown  /* 100 */
--z-modal     /* 200 */
--z-toast     /* 300 */
```

---

## Zustand Stores

### File Location

All stores go in `stores/` with `use` prefix:

```
stores/
├── useAuthStore.ts
├── useModalStore.ts
└── usePageLayoutStore.ts
```

### Store Template

```ts
// stores/useExampleStore.ts
import { create } from 'zustand';

// 1. Define state interface
interface ExampleState {
  count: number;
  isLoading: boolean;
}

// 2. Define actions interface
interface ExampleActions {
  increment: () => void;
  reset: () => void;
}

// 3. Combine into store type
type ExampleStore = ExampleState & ExampleActions;

// 4. Create store with named export
export const useExampleStore = create<ExampleStore>()((set, get) => ({
  // State
  count: 0,
  isLoading: false,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0, isLoading: false }),
}));
```

### Store Rules

1. ALWAYS split `State` and `Actions` interfaces
2. ALWAYS use named exports
3. Keep state flat (avoid deep nesting)
4. Use `set()` for state updates, `get()` to read current state
5. One store per domain (auth, modal, ui, etc.)

### Accessing Store Outside React

```ts
// ✓ CORRECT - For use in axios interceptors, etc.
const { logOut } = useAuthStore.getState();
logOut();

// ✗ WRONG - Hooks only work in React components
const { logOut } = useAuthStore(); // Error outside React
```

---

## API Layer

### Axios Instance

Location: `lib/axios.ts`

```ts
// lib/axios.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add interceptors here
```

ALWAYS import as `api`, not `axios` or `axiosInstance`:

```ts
// ✓ CORRECT
import { api } from '@/lib/axios';

// ✗ WRONG
import axiosInstance from '@/lib/axios';
import axios from '@/lib/axios';
```

### React Query Hooks

Location: `api/`

File naming: `use[Resource].ts` (e.g., `useUsers.ts`, `usePosts.ts`)

### Query Hook Template

```ts
// api/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { User, CreateUserRequest } from '@/types';

// 1. Define query keys
const KEYS = {
  all: ['users'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
};

// 2. Query hooks
export function useUsers() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users');
      return data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await api.get<User>(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// 3. Mutation hooks
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newUser: CreateUserRequest) => {
      const { data } = await api.post<User>('/users', newUser);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
```

### Query Hook Rules

1. ALWAYS define `KEYS` object at top of file
2. ALWAYS use `as const` for query keys
3. ALWAYS type API responses with generics
4. ALWAYS invalidate relevant queries in `onSuccess`
5. Use `enabled` option for conditional fetching

---

## Utility Hooks

### Location

`hooks/` - ONLY for hooks that do NOT make API calls

### Hook Template

```ts
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

### Common Utility Hooks

- `useScrollToTop` - Scroll to top on route change
- `useLocalStorage` - Persist state to localStorage
- `useClickOutside` - Detect clicks outside element
- `useDebounce` - Debounce a value
- `useMediaQuery` - Responsive breakpoint detection

---

## Types

### Location

- Shared types: `types/`
- Single-file types: Keep in the file that uses them

### Type File Template

```ts
// types/auth.ts

// Entities
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
}

// Request payloads
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password1: string;
  password2: string;
}

// Response payloads
export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

// Enums / Union types
export type AuthResult = 'success' | 'error' | 'confirm_email' | 'go2fa';
```

### Type Rules

1. Use `interface` for objects
2. Use `type` for unions, intersections, primitives
3. Suffix request types with `Request`
4. Suffix response types with `Response`
5. Export all types (no default exports)

---

## Constants

### Single File (< 100 lines)

```ts
// constants.ts
export const API_ROUTES = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  SIGNUP: '/auth/signup',
} as const;

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
} as const;
```

### Multiple Files (100+ lines)

```
constants/
├── api.ts
├── routes.ts
├── ui.ts
├── validation.ts
└── index.ts
```

```ts
// constants/index.ts
export * from './api';
export * from './routes';
export * from './ui';
export * from './validation';
```

### Constant Rules

1. ALWAYS use `as const` for object constants
2. Use SCREAMING_SNAKE_CASE for constant names
3. Group related constants in objects

---

## Common Mistakes to Avoid

### ❌ DON'T

```tsx
// Default exports
export default function Button() { }

// Relative imports with ../
import { Button } from '../../../components/ui';

// Hardcoded colors/spacing
<div style={{ padding: '16px', color: '#3b82f6' }}>

// Primitive CSS variables
.button { color: var(--blue-500); }

// API calls in hooks/ folder
// hooks/useUsers.ts - WRONG, should be in api/

// Inline types
function Button(props: { children: React.ReactNode }) { }

// Query hooks without key factories
useQuery({ queryKey: ['users'], ... })

// Store without split interfaces
interface AuthStore {
  isLogged: boolean;
  logIn: () => void;
}
```

### ✅ DO

```tsx
// Named exports
export function Button() { }

// Path aliases
import { Button } from '@/components/ui';

// CSS variables
<div className={styles.container}>

// Semantic CSS variables
.button { color: var(--color-primary); }

// API calls in api/ folder
// api/useUsers.ts - CORRECT

// Separate props interface
interface ButtonProps {
  children: ReactNode;
}
function Button({ children }: ButtonProps) { }

// Query key factories
const KEYS = { all: ['users'] as const };
useQuery({ queryKey: KEYS.all, ... })

// Split state and actions
interface AuthState { isLogged: boolean; }
interface AuthActions { logIn: () => void; }
type AuthStore = AuthState & AuthActions;
```

---

## Checklist Before Committing

- [ ] All exports are named (no `export default`)
- [ ] All imports use `@/` alias (no `../`)
- [ ] Components have `.module.css` files
- [ ] CSS uses semantic variables (not primitives)
- [ ] Stores split State and Actions interfaces
- [ ] Query hooks have KEYS factory
- [ ] Types are in correct location
- [ ] Barrel files updated if adding new exports
- [ ] Modal content components accept optional `handleClose` prop
- [ ] Form components use consistent props pattern (`value`/`setValue`)

---

## Modal Store

### Overview

The modal store (`stores/useModalStore.ts`) manages a global modal system with animation support.

### Opening a Modal

```tsx
import { useModalStore } from '@/stores';
import { ConfirmModal } from '@/components/modals/ConfirmModal/ConfirmModal';

function MyComponent() {
  const { openModal } = useModalStore();

  const handleDelete = () => {
    openModal(
      <ConfirmModal
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        onConfirm={() => deleteItem()}
      />,
    );
  };

  return <Button onClick={handleDelete}>Delete</Button>;
}
```

### Creating Modal Content Components

Modal content components should accept an optional `handleClose` prop:

```tsx
// components/modals/ConfirmModal/ConfirmModal.tsx
import { useModalStore } from '@/stores';
import { Button } from '@/components/ui';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  handleClose?: () => void; // Optional - called automatically on close
}

export function ConfirmModal({ title, message, onConfirm, handleClose }: ConfirmModalProps) {
  const { closeModal } = useModalStore();

  const handleConfirm = () => {
    onConfirm();
    closeModal();
  };

  return (
    <div className={styles.modal}>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={closeModal}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
```

### Modal Store API

| Method               | Description                           |
| -------------------- | ------------------------------------- |
| `openModal(content)` | Opens modal with ReactElement content |
| `closeModal()`       | Closes modal with animation (200ms)   |
| `isOpen`             | Boolean - modal visibility state      |
| `isClosing`          | Boolean - true during close animation |
| `content`            | Current modal content or null         |

### Modal Content Location

```
components/
└── modals/
    ├── ConfirmModal/
    │   ├── ConfirmModal.tsx
    │   └── ConfirmModal.module.css
    ├── ExampleModal/
    │   └── ...
    └── index.ts
```

---

## Auth Store

### Overview

The auth store (`stores/useAuthStore.ts`) manages authentication state, tokens, and user data.

### Login Flow

```tsx
import { useAuthStore } from '@/stores';
import type { LoginRequest, AuthResult } from '@/types/auth';

function LoginPage() {
  const { logIn, isLoading, isLogged } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (formData: LoginRequest) => {
    const result: AuthResult = await logIn(
      formData,
      () => navigate('/2fa'), // Called when 2FA is required
    );

    if (result === 'success') {
      navigate('/dashboard');
    }

    if (result === 'confirm_email') {
      navigate('/verify-email');
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (isLogged) navigate('/');
  }, [isLogged]);
}
```

### Auth Store API

| Method                             | Description                               |
| ---------------------------------- | ----------------------------------------- |
| `logIn(credentials, onRequire2FA)` | Returns `AuthResult`                      |
| `logOut()`                         | Clears tokens and state                   |
| `getAccessToken()`                 | Returns valid token (refreshes if needed) |
| `getUser()`                        | Returns `User` from localStorage          |
| `register(data)`                   | Returns `boolean`                         |
| `confirmEmail(code)`               | Returns `boolean`                         |
| `requestPasswordReset(data)`       | Returns `boolean`                         |
| `resetPassword(data)`              | Returns `boolean`                         |
| `changePassword(data)`             | Returns `boolean`                         |

### Auth State

| Property    | Type      | Description                        |
| ----------- | --------- | ---------------------------------- |
| `isLogged`  | `boolean` | User authentication status         |
| `isLoading` | `boolean` | Loading state for async operations |

### AuthResult Values

```ts
type AuthResult =
  | 'success' // Login successful
  | 'confirm_email' // Email confirmation needed
  | 'go2fa' // 2FA required
  | 'otp_fail' // 2FA code invalid
  | 'wrong_data' // Invalid credentials
  | 'reset_psw' // Password reset required
  | 'account_block' // Account blocked
  | 'invalid' // Invalid request
  | 'error'; // Generic error
```

### Using Auth Outside React Components

```ts
// In axios interceptors or other non-React code
import { useAuthStore } from '@/stores';

const { getAccessToken, logOut } = useAuthStore.getState();
const token = await getAccessToken();
```

---

## UI Components

### Button

```tsx
import { Button } from '@/components/ui';

<Button
  variant="primary" // primary | secondary | danger | warning | info | success
  size="md" // sm | md | lg | xl
  disabled={false}
  onClick={handleClick}
>
  Click Me
</Button>;
```

### Card

```tsx
import { Card, CardTitle } from '@/components/ui';

<Card className={styles.myCard}>
  <CardTitle>Card Title</CardTitle>
  <p>Card content goes here</p>
</Card>;
```

### Spinner

```tsx
import { Spinner } from '@/components/ui';

<Spinner
  variant="primary"  // primary | secondary
  size="md"          // sm | md | lg
/>

// Common pattern: Button with loading state
<Button disabled={isLoading}>
  {isLoading ? <Spinner variant="secondary" size="sm" /> : 'Submit'}
</Button>
```

### Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell, TableColumn } from '@/components/ui';

<Table aria-label="Users table" radius={8}>
  <TableHeader>
    <TableColumn>Name</TableColumn>
    <TableColumn>Email</TableColumn>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

### Paginator

```tsx
import { Paginator } from '@/components/ui';

<Paginator
  page={currentPage}
  numPages={totalPages}
  onPageChange={setCurrentPage}
  size="md" // sm | md | lg
  variant="rounded" // rounded | flat
  showEdges={true} // Show first/last buttons
/>;
```

### ThemeToggle

```tsx
import { ThemeToggle } from '@/components/ui';

<ThemeToggle size="md" />; // sm | md | lg
```

---

## Form Components

### Input

```tsx
import { Input } from '@/components/forms';

<Input
  name="email"
  label="Email Address"
  value={value}
  setValue={setValue}
  placeholder="Enter email"
  // Variants
  variant="bordered" // flat | bordered | faded | underlined
  // Colors
  color="primary" // default | primary | secondary | success | warning | danger
  // Sizes
  size="md" // sm | md | lg
  // Border Radius
  radius="md" // none | sm | md | lg | full
  // Label Placement
  labelPlacement="outside" // outside | inside | outside-left
  // States
  isRequired={false}
  isDisabled={false}
  isReadOnly={false}
  isClearable={false}
  // Error
  errorMessage="Invalid email"
  // Multiline (textarea)
  multiline={false}
  rows={4}
/>;
```

### PasswordEyeInput

```tsx
import { PasswordEyeInput } from '@/components/forms';

<PasswordEyeInput
  name="password"
  label="Password"
  value={password}
  setValue={setPassword}
  placeholder="Enter password"
/>;
```

### Select

```tsx
import { Select } from '@/components/forms';

const options = [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' },
];

<Select
  label="Choose Option"
  placeholder="Select..."
  value={selected}
  onChange={(e) => setSelected(e.target.value)}
  options={options}
  // States
  required={false}
  disabled={false}
  error="Error message"
  // Size
  size="md" // sm | md | lg
/>;
```

### DatePicker

```tsx
import { DatePicker } from '@/components/forms';

<DatePicker
  label="Select Date"
  value={dateValue} // Date | null
  onChange={setDateValue}
  placeholderText="Pick a date"
  // States
  required={false}
  disabled={false}
  error="Error message"
  // Constraints
  minDate={new Date()}
  maxDate={new Date('2025-12-31')}
  // Size
  size="md" // sm | md | lg
/>;
```

### DateTimePicker

```tsx
import { DateTimePicker } from '@/components/forms';

<DateTimePicker
  name="datetime"
  label="Date & Time"
  value={dateTimeValue} // string (ISO format)
  setValue={setDateTimeValue}
  variant="bordered"
/>;
```

### FileUpload

```tsx
import { FileUpload } from '@/components/forms';

<FileUpload
  name="document"
  label="Upload Document"
  file={uploadedFile} // File | null
  setFile={setUploadedFile}
  // Constraints
  accept=".pdf,.doc,.docx,image/*"
  maxSizeMB={5}
  // Display
  description="PDF, DOC, or images up to 5MB"
  // States
  isRequired={false}
  isDisabled={false}
/>;
```

---

## Common Patterns

### Form with Validation

```tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Input, PasswordEyeInput } from '@/components/forms';
import { Button, Spinner } from '@/components/ui';

function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Submit logic
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        name="email"
        label="Email"
        value={formData.email}
        setValue={(value) => handleChange('email', value)}
        placeholder="Enter email"
        variant="bordered"
      />
      <PasswordEyeInput
        name="password"
        label="Password"
        value={formData.password}
        setValue={(value) => handleChange('password', value)}
        placeholder="Enter password"
      />
      <Button type="submit" variant="primary" disabled={isLoading}>
        {isLoading ? <Spinner variant="secondary" size="sm" /> : 'Login'}
      </Button>
    </form>
  );
}
```

### Modal with Confirmation

```tsx
import { useModalStore } from '@/stores';
import { Button } from '@/components/ui';

function DeleteButton({ itemId }: { itemId: string }) {
  const { openModal, closeModal } = useModalStore();

  const handleDelete = async () => {
    await deleteItem(itemId);
    closeModal();
    toast.success('Item deleted');
  };

  const confirmDelete = () => {
    openModal(
      <div className={styles.confirmModal}>
        <h2>Delete Item?</h2>
        <p>This action cannot be undone.</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>,
    );
  };

  return (
    <Button variant="danger" onClick={confirmDelete}>
      Delete
    </Button>
  );
}
```

---

## Quick Reference

| Task                  | Location                  | Pattern                     |
| --------------------- | ------------------------- | --------------------------- |
| Create UI component   | `components/ui/Name/`     | Folder + CSS Module         |
| Create form component | `components/forms/Name/`  | Folder + CSS Module         |
| Create modal content  | `components/modals/Name/` | Folder + CSS Module         |
| Create page           | `pages/Name/`             | Folder + CSS Module         |
| Create query hook     | `api/useName.ts`          | KEYS + useQuery/useMutation |
| Create utility hook   | `hooks/useName.ts`        | No API calls                |
| Create store          | `stores/useNameStore.ts`  | State + Actions split       |
| Add types             | `types/name.ts`           | interface/type exports      |
| Add constants         | `constants/`              | SCREAMING_SNAKE + as const  |
| Add styles            | Component folder          | `.module.css`               |
