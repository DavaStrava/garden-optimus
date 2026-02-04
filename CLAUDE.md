# Garden Optimus - Claude Code Context

## Project Overview
Garden Optimus is a plant care management web application that helps users track their indoor and outdoor plants, log care activities, upload photos, and get AI-powered health assessments using Claude Vision.

## Post-Commit Documentation
**IMPORTANT:** After making any git commit, immediately run `/post-commit-summary` to document the changes. This saves a summary to `.claude/last-commit-summary.md` which is displayed at the start of future sessions.

## Tech Stack
- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM (v6)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Authentication**: NextAuth.js v5 (beta) with OAuth (Google/GitHub)
- **AI**: Anthropic Claude API for plant health analysis and species identification
- **Search**: Fuse.js for fuzzy species matching
- **Image Processing**: browser-image-compression for client-side image optimization
- **Package Manager**: npm

## Project Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── assessments/   # AI health assessment endpoint
│   │   ├── auth/          # NextAuth handlers + registration check
│   │   ├── care-logs/     # Care logging endpoint
│   │   ├── care-schedules/ # Care schedule CRUD (global + per-schedule)
│   │   ├── health/        # Health check endpoint
│   │   ├── photos/        # Photo management
│   │   ├── plants/        # Plant CRUD operations
│   │   ├── species/       # Species search and AI identification
│   │   │   ├── identify/  # AI plant identification endpoint
│   │   │   └── search/    # Species fuzzy search endpoint
│   │   └── upload/        # File upload endpoint
│   ├── login/             # Login page
│   ├── plants/            # Plant pages (list, detail, edit, new)
│   ├── registration-closed/ # User limit reached page
│   ├── schedules/         # Care schedules management page
│   ├── species/           # Plant species library
│   └── page.tsx           # Dashboard/home
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # App-specific components
├── lib/                   # Utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── auth-utils.ts     # Auth helper functions (testable)
│   ├── prisma.ts         # Prisma client singleton
│   ├── ai.ts             # Claude API integration (health assessments)
│   ├── ai-identify.ts    # Claude Vision for plant identification
│   ├── image-compression.ts # Client-side image validation & compression
│   ├── species-matcher.ts # Fuzzy species matching with Fuse.js
│   ├── storage.ts        # File storage abstraction (local/Vercel Blob)
│   ├── user-limit.ts     # User registration limit (10 users max)
│   ├── rate-limit.ts     # In-memory rate limiting
│   └── utils.ts          # General utilities
└── types/                 # TypeScript type definitions
    └── species.ts        # Shared species type definitions
prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Plant species seed data
# Root config files
├── sentry.client.config.ts # Sentry client-side config
├── sentry.server.config.ts # Sentry server-side config
└── sentry.edge.config.ts   # Sentry edge runtime config
```

## Key Files
- `src/lib/auth.ts` - NextAuth configuration with Google/GitHub OAuth + dev bypass + user limit check
- `src/lib/auth-utils.ts` - Auth helper functions (platform detection, email validation)
- `src/lib/prisma.ts` - Prisma client singleton for database access
- `src/lib/ai.ts` - Claude Vision API integration for plant health assessment
- `src/lib/ai-identify.ts` - Claude Vision API for AI plant species identification
- `src/lib/image-compression.ts` - Client-side image validation (HEIC/AVIF detection via magic bytes) and compression
- `src/lib/species-matcher.ts` - Fuzzy matching of AI identifications to database species using Fuse.js
- `src/lib/storage.ts` - File storage abstraction (Vercel Blob in production, local filesystem in dev)
- `src/lib/user-limit.ts` - User registration limit enforcement (10 users max, admin override)
- `src/lib/rate-limit.ts` - In-memory rate limiting for API endpoints
- `src/types/species.ts` - Shared TypeScript types for species data and AI identification
- `prisma/schema.prisma` - Database models (User, Plant, CareLog, HealthAssessment, PlantSpecies, PlantPhoto, CareSchedule)
- `prisma/seed.ts` - Seed data with 500 plant species (indoor, outdoor, Pacific Northwest natives, herbs, vegetables, and more)
- `sentry.*.config.ts` - Sentry error monitoring configuration (client, server, edge)

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

# Production: Vercel Blob Storage (auto-added when Blob Store is connected)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Production: Error Monitoring (Sentry)
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=garden-optimus

# Production: User Limit Admin Override
ADMIN_EMAILS=admin@example.com,owner@example.com
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

## Production Infrastructure

### User Registration Limit
The app enforces a 10-user limit for early access:
- `src/lib/user-limit.ts` - Core limit enforcement logic
- `src/app/api/auth/check-registration/route.ts` - API to check if registration is open
- `src/app/registration-closed/page.tsx` - Page shown when limit is reached
- Admin emails (via `ADMIN_EMAILS` env var) can bypass the limit
- Existing users can always sign in; limit only applies to new registrations

### Rate Limiting
API endpoints are protected with in-memory rate limiting:
- `src/lib/rate-limit.ts` - Rate limit utility
- Registration check: 10 requests per minute per IP
- AI plant identification: 10 requests per hour per user
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded
- Note: For multi-instance deployments, upgrade to Redis-based rate limiting

### Error Monitoring (Sentry)
Sentry is configured for production error tracking:
- `sentry.client.config.ts` - Client-side errors + session replay
- `sentry.server.config.ts` - Server-side errors
- `sentry.edge.config.ts` - Edge runtime errors
- 20% trace sampling in production (cost-effective)
- 100% sampling in development
- Disabled entirely when `NODE_ENV !== "production"`

### Health Check Endpoint
`/api/health` provides application health status:
- **Unauthenticated**: Returns `{ status: "healthy", timestamp: "..." }`
- **Authenticated**: Includes environment variable status (database, auth, AI, blob, etc.)
- Returns `503` if database connection fails

### Vercel Blob Storage (Required for Production)
Photo uploads require Vercel Blob storage to be connected in production:
1. Go to Vercel Dashboard → Project → **Storage** tab
2. Click **Create** → Select **Blob**
3. Connect the Blob store to your project
4. `BLOB_READ_WRITE_TOKEN` will be automatically added to environment variables

**Important:** Without Vercel Blob connected, photo uploads will fail silently in production (plants are created but photos are not saved). Local development uses filesystem storage (`public/uploads/`) and doesn't require Blob.

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
- **Development**: Photos stored locally in `public/uploads/`
- **Production**: Photos stored in Vercel Blob Storage (CDN-backed)
- Storage abstraction layer: `src/lib/storage.ts`
- Filenames: `{plantId}-{timestamp}.{ext}`
- Assessment photos prefixed with `assessment-`
- Automatic environment detection via `VERCEL` env var

### Storage Utilities (`src/lib/storage.ts`)
```typescript
import { uploadPhoto, deletePhoto, validateImageFile, generatePhotoFilename } from "@/lib/storage";

// Upload a file or buffer
const url = await uploadPhoto(file, "photo.jpg");
const url = await uploadPhoto(buffer, "photo.jpg");

// Delete a photo
await deletePhoto(url);

// Validate before upload
const error = validateImageFile(file);
if (error) return { error };

// Generate unique filename
const filename = generatePhotoFilename(plantId, file.type, "prefix-");
```

## AI Health Assessment Flow
1. User uploads photo via `HealthAssessmentButton`
2. Image sent to `/api/assessments` as FormData
3. Server converts to base64, calls Claude Vision API
4. Response parsed for health status, issues, recommendations
5. Assessment saved to database with photo

## AI Plant Identification

The app includes AI-powered plant identification when adding new plants.

### Model Configuration

**Model:** Claude Opus 4.5 (`claude-opus-4-5-20251101`)
**Extended Thinking:** Enabled with 10,000 token budget
**Max Tokens:** 11,000 (must be > budget_tokens)

#### Why Opus 4.5 + Extended Thinking?

Initially, the identification used Claude Sonnet 4 without extended thinking. This caused consistent misidentifications - for example, a Baby Rubber Plant (Peperomia) was identified as various Pothos varieties.

The problem: Without extended thinking, the model must immediately output structured JSON, forcing quick classifications without deliberation.

The solution: Claude Opus 4.5 with extended thinking allows the model to reason internally before answering:
- Examine leaf shape, thickness, and texture
- Consider growth habit (compact vs vining)
- Note presence/absence of aerial roots
- Compare against similar species
- Rule out incorrect matches

This deliberation significantly improves accuracy for visually similar plants.

#### Cost Implications

| Model | Input | Output |
|-------|-------|--------|
| Sonnet 4 | $3/M tokens | $15/M tokens |
| Opus 4.5 | $15/M tokens | $75/M tokens |

The ~5x cost increase is acceptable given the rate limit (10 identifications/hour/user) and the significant accuracy improvement.

### Flow
1. User clicks "Identify with AI" button in plant form (`AIIdentifyButton` component)
2. User uploads or takes a photo of their plant
3. Client-side validation checks for HEIC/AVIF via magic bytes (common iPhone formats)
4. Image compressed client-side using `browser-image-compression` (max 1MB, 1920px)
5. Image sent to `/api/species/identify` as FormData
6. Server validates, converts to base64, calls Claude Vision API (`src/lib/ai-identify.ts`)
7. Model reasons through identification using extended thinking (internal, not visible to user)
8. AI returns species name, scientific name, confidence level, and care hints
9. Server fuzzy-matches AI result to database species using Fuse.js (`src/lib/species-matcher.ts`)
10. User sees matched species from database and can select one for their plant

### Components
- `AIIdentifyButton` - Trigger button + dialog for the identification flow
- `SpeciesMatchPicker` - Displays AI identification results and database matches
- `SpeciesCombobox` - Searchable dropdown for manual species selection
- `SpeciesPreviewCard` - Preview card showing species details

### API Endpoints
- `POST /api/species/identify` - AI plant identification (rate limited: 10/hour per user)
- `GET /api/species/search` - Fuzzy search species by name (query param: `q`, optional: `location`, `limit`)

### Image Validation
The `src/lib/image-compression.ts` module provides:
- **Magic byte detection** for HEIC/AVIF files that browsers misreport as JPEG
- **Client-side compression** to reduce upload size
- **Async validation** that checks actual file content, not just MIME type

```typescript
import { validateImageFileAsync, compressImage, isHeicOrAvif } from "@/lib/image-compression";

// Async validation (checks magic bytes)
const result = await validateImageFileAsync(file);
if (!result.valid) {
  console.error(result.error); // e.g., "This image appears to be HEIC/AVIF format..."
}

// Compress before upload
const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
```

### Species Matching
The `src/lib/species-matcher.ts` module provides fuzzy matching:
- Uses Fuse.js for fuzzy search on common names and scientific names
- Includes common plant aliases (e.g., "Devil's Ivy" → "Pothos")
- Returns confidence scores: high (≤0.1), medium (≤0.3), low (>0.3)

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

## Care Schedule Management

### Overview
Users can create, edit, and delete recurring care schedules for their plants. Schedules track when care tasks are due and automatically advance the next due date when care is logged.

### Pages & Components
- **`/schedules`** - Central page showing all enabled care schedules across all plants, with status filter tabs (All / Overdue / Due Today / Due Soon / Upcoming)
- **Plant detail page** (`/plants/[id]`) - "Upcoming Care" card shows per-plant schedules with inline Done, Edit, and Delete actions
- **CareScheduleForm** - Toggle-based form on plant detail sidebar for enabling/disabling care type reminders with configurable intervals

### Key Components
- `UpcomingCareCard` - Client component for plant detail "Upcoming Care" section with action buttons
- `ScheduleList` - Filterable list of all schedules with status tabs and action buttons
- `ScheduleEditPopover` - Inline popover to edit interval and next due date
- `DeleteScheduleButton` - Delete confirmation dialog following the same pattern as `DeletePlantButton`
- `QuickCareButton` - "Done" button that logs care and advances the schedule's next due date
- `ReminderStatusBadge` - Colored badge showing overdue/due-today/due-soon/upcoming status

### API Endpoints
- `GET /api/care-schedules` - List all enabled schedules for user (supports `dueWithin` and `status` query params)
- `POST /api/care-schedules` - Create a new schedule
- `GET/PUT/DELETE /api/care-schedules/[id]` - Read/update/delete a specific schedule
- `GET /api/plants/[id]/care-schedules` - List schedules for a specific plant
- `POST /api/plants/[id]/care-schedules` - Create or upsert a schedule for a plant (unique constraint: `plantId_careType`)

### Care Schedule Flow
1. Schedules are auto-created when a user first logs WATERING for a plant (interval derived from species waterFrequency)
2. Users can manually enable additional care types via CareScheduleForm on the plant detail page
3. When care is logged (via CareLogForm or QuickCareButton), the schedule's `nextDueDate` advances by `intervalDays`
4. Dashboard shows tasks due within 3 days; the `/schedules` page shows all schedules regardless of due date

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
- `src/lib/image-compression.test.ts` - Image validation and compression tests
- `src/lib/species-matcher.test.ts` - Fuzzy species matching tests
- `src/components/care-log-form.test.tsx` - Care log form tests (5 tests)
- `src/components/delete-plant-button.test.tsx` - Delete button tests (5 tests)
- `src/components/ai-identify-button.test.tsx` - AI identification button tests
- `src/components/species-combobox.test.tsx` - Species combobox tests
- `src/components/species-match-picker.test.tsx` - Species match picker tests
- `src/components/delete-schedule-button.test.tsx` - Delete schedule button tests
- `src/components/schedule-edit-popover.test.tsx` - Schedule edit popover tests
- `src/components/upcoming-care-card.test.tsx` - Upcoming care card tests
- `src/components/care-schedule-form.test.tsx` - Care schedule form tests (toggle-off fix)

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

## Troubleshooting

### Photos not saving in production (but work locally)
**Symptom:** Plants are created but photos show "No photos yet" in production, while everything works locally.

**Cause:** Vercel Blob storage is not connected. Local dev uses filesystem, production requires Vercel Blob.

**Fix:**
1. Vercel Dashboard → Project → Storage → Create → Blob
2. Connect to project (adds `BLOB_READ_WRITE_TOKEN` automatically)
3. Redeploy

### AI identification returns wrong species
**Symptom:** Plant identification consistently misidentifies visually similar plants.

**Cause:** Model may need more reasoning time for difficult identifications.

**Current config:** Uses Claude Opus 4.5 with extended thinking (10K token budget) for better accuracy. If issues persist, the species may not be in the 500-species database - check `/species` library.

### HEIC/AVIF images rejected
**Symptom:** iPhone photos fail validation even though they appear to be JPEG.

**Cause:** iPhones save photos in HEIC/AVIF format but browsers misreport them as JPEG. The app detects this via magic byte inspection.

**Fix for users:** iPhone Settings → Camera → Formats → Select "Most Compatible"
