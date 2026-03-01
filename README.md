# KHCRM

## Getting Started

### 1. Install dependencies
```
npm install
```

### 2. Development
```
npm run dev
```

### 3. Typecheck
```
npm run typecheck
```

### 4. Lint
```
npm run lint
```

### 5. Format
```
npm run format
```

### 6. Build
```
npm run build
```

### 7. Deploy
- Deploy using Vercel or your preferred platform.

## Environment Variables
- Copy `.env.example` to `.env.local` and fill in the values.
- Server-only variables: `DATABASE_URL`, `SECRET_KEY`
- Client variables: `NEXT_PUBLIC_API_URL`

## Folder Structure
- `/src` - Application source code
- `/supabase` - Database migrations (placeholder)
- `/scripts` - Utility scripts (placeholder)

## Pre-commit Hooks
- Husky + lint-staged run `eslint` and typecheck before commit.

## Runtime Env Validation
- See `src/env.server.ts` and `src/env.client.ts` for Zod-based validation.
