# Garden Optimus - Claude Code Context

## Project Overview
Garden Optimus is a plant care management web application that helps users track their indoor and outdoor plants, log care activities, upload photos, and get AI-powered health assessments using Claude Vision.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM (v6)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Authentication**: NextAuth.js v5 (beta) with OAuth (Google/GitHub)
- **AI**: Anthropic Claude API for plant health analysis
- **Package Manager**: npm

## Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── assessments/   # AI health assessment endpoint
│   │   ├── auth/          # NextAuth handlers
│   │   ├── care-logs/     # Care logging endpoint
│   │   ├── photos/        # Photo management
│   │   ├── plants/        # Plant CRUD operations
│   │   └── upload/        # File upload endpoint
│   ├── login/             # Login page
│   ├── plants/            # Plant pages (list, detail, edit, new)
│   ├── species/           # Plant species library
│   └── page.tsx           # Dashboard/home
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # App-specific components
├── lib/                   # Utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── auth-utils.ts     # Auth helper functions (testable)
│   ├── prisma.ts         # Prisma client singleton
│   ├── ai.ts             # Claude API integration
│   └── utils.ts          # General utilities
└── types/                 # TypeScript type definitions
prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Plant species seed data
```

## Key Files
- `src/lib/auth.ts` - NextAuth configuration with Google/GitHub OAuth + dev bypass
- `src/lib/auth-utils.ts` - Auth helper functions (platform detection, email validation)
- `src/lib/prisma.ts` - Prisma client singleton for database access
- `src/lib/ai.ts` - Claude Vision API integration for plant health assessment
- `prisma/schema.prisma` - Database models (User, Plant, CareLog, HealthAssessment, PlantSpecies, PlantPhoto, CareSchedule)
- `prisma/seed.ts` - Seed data with 500 plant species (indoor, outdoor, Pacific Northwest natives, herbs, vegetables, and more)

## Plant Species Library
The PlantSpecies model serves as a comprehensive reference library with 500 species including:
- Popular houseplants (Pothos, Monstera, Snake Plant, etc.)
- Pacific Northwest natives (Sword Fern, Salal, Douglas Fir, etc.)
- Outdoor plants (Rhododendron, Japanese Maple, Hydrangea, etc.)
- Herbs and vegetables (Basil, Tomato, Kale, etc.)
- Fruits and berries (Apple, Blueberry, Strawberry, etc.)

### PlantSpecies Fields
- **commonName** (required) - Display name (e.g., "Golden Pothos")
- **scientificName** (optional) - Latin name (e.g., "Epipremnum aureum")
- **description** (optional) - Detailed information about the plant's characteristics, growth habits, and general care overview. Displayed on species library page and plant detail care guide.
- **lightNeeds** (required) - Light requirements (e.g., "Bright indirect light")
- **waterFrequency** (required) - Watering schedule (e.g., "Weekly, when top inch is dry")
- **humidity** (optional) - Humidity preferences (e.g., "Average to High")
- **temperature** (optional) - Temperature range (e.g., "65-80°F")
- **toxicity** (optional) - Safety information for pets/humans (e.g., "Toxic to pets")
- **careNotes** (optional) - Additional care tips and notes
- **imageUrl** (optional) - Reference image URL (not currently used)
- **suitableFor** (required array) - INDOOR, OUTDOOR, or both

## Common Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint

# Testing commands
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Open Vitest UI
npm run test:coverage # Run tests with coverage report

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database (no migrations)
npm run db:migrate   # Run migrations
npm run db:seed      # Seed plant species data
npm run db:studio    # Open Prisma Studio
```

## Database Schema
Key models:
- **User** - Authenticated users (NextAuth)
- **Plant** - User's plants with name, location (INDOOR/OUTDOOR), species reference
- **PlantSpecies** - Reference library with 500 species including detailed descriptions and care requirements (commonName, scientificName, description, lightNeeds, waterFrequency, humidity, temperature, toxicity, careNotes, suitableFor)
- **PlantPhoto** - Photos uploaded for each plant
- **CareLog** - Care activities (WATERING, FERTILIZING, REPOTTING, PRUNING, PEST_TREATMENT, OTHER)
- **HealthAssessment** - AI-generated health analysis results
- **CareSchedule** - User-defined care reminders with intervals and due dates
- **UserLocation** - User's geographic location for weather integration

## Environment Variables
Required in `.env.local`:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...

# Optional: Enable dev authentication (local development only)
ENABLE_DEV_AUTH=true
```

## Development Authentication

For local development without OAuth setup, a dev login bypass is available.

### Enable Dev Auth
Add to `.env.local`:
```
ENABLE_DEV_AUTH=true
```

### How It Works
1. Go to `/login` and click "Dev Login (No OAuth Required)"
2. Creates/uses a dev user: `dev@garden-optimus.local`
3. Only works when ALL conditions are met:
   - `NODE_ENV=development`
   - `ENABLE_DEV_AUTH=true`
   - Not on production platforms (Vercel, Railway, Render, Heroku, AWS Lambda, Netlify)

### Security
- Dev auth is **never** available in production
- Only `@garden-optimus.local` emails are accepted
- Multiple safeguards prevent accidental production exposure

## Code Patterns

### API Routes
All API routes follow this pattern:
1. Check authentication with `await auth()`
2. Verify resource ownership before modifications
3. Return appropriate HTTP status codes
4. Use Prisma for database operations

### Server Components
Pages use React Server Components by default:
- Fetch data directly with Prisma
- Use `auth()` for session access
- Redirect unauthenticated users to `/login`

### Client Components
Interactive components use `"use client"` directive:
- Forms with state management
- Dialogs and modals
- File uploads
- Components using `useRouter`, `useState`, etc.

## Adding New Features

### New Plant Field
1. Update `prisma/schema.prisma`
2. Run `npm run db:push` or create migration
3. Update `PlantForm` component
4. Update plant API routes
5. Update plant detail page display

### New Care Type
1. Add to `CareType` enum in `prisma/schema.prisma`
2. Run `npm run db:push`
3. Add to `careTypes` array in `src/components/care-log-form.tsx`
4. Add emoji mapping in dashboard and plant detail page

### New shadcn/ui Component
```bash
npx shadcn@latest add [component-name]
```

### Adding/Updating Plant Species
1. Edit `prisma/seed.ts` to add/modify species entries
2. Run `npm run db:seed` to update the database
3. Species data includes: commonName, scientificName, description, lightNeeds, waterFrequency, humidity, temperature, toxicity, careNotes, and suitableFor array
4. Descriptions should be detailed paragraphs explaining the plant's characteristics and care overview

## Image Handling
- Photos stored in `public/uploads/`
- Filenames: `{plantId}-{timestamp}.{ext}`
- Assessment photos prefixed with `assessment-`
- Local storage (upgrade path to S3/R2 available)

## AI Health Assessment Flow
1. User uploads photo via `HealthAssessmentButton`
2. Image sent to `/api/assessments` as FormData
3. Server converts to base64, calls Claude Vision API
4. Response parsed for health status, issues, recommendations
5. Assessment saved to database with photo

## Species Library UI
The plant species library (`/species`) provides a searchable, filterable catalog of all 500 plant species:
- **Search**: Search by common name or scientific name
- **Filter**: Filter by Indoor, Outdoor, or All plants
- **Display**: Each species card shows:
  - Common name and scientific name
  - Full description paragraph explaining the plant
  - Suitability badges (Indoor/Outdoor)
  - Light requirements
  - Water frequency
  - Humidity (if specified)
  - Temperature (if specified)
  - Toxicity/pet safety
  - Care notes and tips
  - Count of plants in user's garden (if any)

Species information is also displayed in the plant detail page's "Care Guide" card, with the description shown at the top before specific care requirements.

## Testing

### Setup
- **Framework**: Vitest + React Testing Library
- **Config**: `vitest.config.ts`
- **Setup file**: `src/test/setup.ts` (mocks Next.js router, next-auth, browser APIs)
- **Utilities**: `src/test/utils.tsx` (custom render, mock data factories)

### Test File Location
Place test files next to the code they test:
- `src/components/Button.tsx` → `src/components/Button.test.tsx`
- `src/lib/utils.ts` → `src/lib/utils.test.ts`

### Existing Tests
- `src/lib/utils.test.ts` - Utility function tests (6 tests)
- `src/lib/auth-utils.test.ts` - Auth helper tests (32 tests)
- `src/components/care-log-form.test.tsx` - Care log form tests (5 tests)
- `src/components/delete-plant-button.test.tsx` - Delete button tests (5 tests)

### Mock Data Helpers
Available in `src/test/utils.tsx`:
- `createMockPlant()` - Create mock plant data
- `createMockSpecies()` - Create mock species data
- `createMockCareLog()` - Create mock care log data
- `createMockAssessment()` - Create mock health assessment data

### Writing Tests
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@/test/utils";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Mocking Fetch
```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({ data: "test" }),
});
```
