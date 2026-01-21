# Phased Rollout Plan: Dashboard Enhancements & Push Notifications

## Overview
Implementation of visual dashboard enhancements and push notification system for Garden Optimus, broken into 4 independent phases that build progressively from immediate user-facing improvements to full automated notifications.

## Current State
- Dashboard shows 6 recent plants, CareAlerts component displays schedules due within 3 days
- CareSchedule model has `nextDueDate` (indexed), `enabled`, `intervalDays`, `lastCaredAt` fields
- API endpoint `/api/care-schedules` supports `?dueWithin=N` and `?status=overdue|due-today|due-soon|upcoming` filters
- `getReminderStatus()` utility calculates priority status
- QuickCareButton exists for one-click care logging
- UserLocation model has timezone field
- PlantSpecies model has `description` field for additional context
- **PlantForm exists but uses basic dropdown (poor UX for 50+ species), no AI identification**
- **No background jobs, no PushSubscription model, no settings page, no PWA manifest**

---

---

## Prerequisites: Before Phase 0

**CRITICAL: Complete these setup tasks BEFORE starting Phase 0 implementation.**

### Prerequisite 1: Production Database Setup (30 minutes)

**Why:** Need database connection for all features; migrations must run before code deployment.

**Steps:**
1. **Create Vercel Postgres Database**
   - Vercel Dashboard → Storage → Create Database → Postgres
   - Free tier: 256MB storage (sufficient for 10 users)
   - Alternative: Neon, Supabase, or Railway

2. **Get Connection String**
   - Copy `POSTGRES_PRISMA_URL` from Vercel
   - Add to local `.env.local`:
     ```bash
     DATABASE_URL="postgresql://..."
     ```

3. **Run Initial Migration**
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed  # Seed plant species library
   ```

4. **Verify Connection**
   ```bash
   npx prisma studio  # Should open and show empty tables
   ```

**Deliverable:** ✅ Database created, connected, and seeded with plant species

---

### Prerequisite 2: Blob Storage Integration (1-2 hours)

**Why:** Vercel has read-only filesystem; file uploads fail without cloud storage.

**Steps:**

**1. Install Blob Storage SDK**
```bash
npm install @vercel/blob
```

**2. Create Vercel Blob Store**
- Vercel Dashboard → Storage → Create Blob Store
- Connect to your project
- Auto-adds `BLOB_READ_WRITE_TOKEN` env var

**3. Create Storage Abstraction Layer**

Create `src/lib/storage.ts`:
```typescript
import { put, del } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const IS_PRODUCTION = process.env.VERCEL === '1';

export async function uploadPhoto(
  file: File,
  filename: string
): Promise<string> {
  if (IS_PRODUCTION) {
    // Vercel: Use Blob Storage
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });
    return blob.url;
  } else {
    // Local dev: Use filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public/uploads');

    // Create directory if doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
  }
}

export async function deletePhoto(url: string): Promise<void> {
  if (IS_PRODUCTION) {
    // Vercel: Delete from Blob Storage
    await del(url);
  } else {
    // Local dev: Delete from filesystem
    const filepath = path.join(process.cwd(), 'public', url);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}
```

**4. Update Upload API Route**

Modify `src/app/api/upload/route.ts`:
```typescript
import { uploadPhoto } from '@/lib/storage';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const plantId = formData.get('plantId') as string;

    if (!file || !plantId) {
      return NextResponse.json(
        { error: 'Missing file or plantId' },
        { status: 400 }
      );
    }

    // Generate filename
    const ext = file.name.split('.').pop();
    const filename = `${plantId}-${Date.now()}.${ext}`;

    // Upload (works in dev and prod)
    const url = await uploadPhoto(file, filename);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

**5. Update Photo Deletion API**

Modify `src/app/api/photos/[id]/route.ts`:
```typescript
import { deletePhoto } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const photo = await prisma.plantPhoto.findUnique({
      where: { id: params.id },
      include: { plant: true },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify ownership
    if (photo.plant.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from storage
    await deletePhoto(photo.url);

    // Delete from database
    await prisma.plantPhoto.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}
```

**6. Test Locally**
```bash
# Should still work with local filesystem
npm run dev
# Try uploading a plant photo
```

**Deliverable:** ✅ Photo upload/delete works locally AND will work on Vercel

---

### Prerequisite 3: Error Monitoring Setup (Sentry) (20 minutes)

**Why:** Need visibility into production errors; critical for debugging issues users encounter.

**Steps:**

**1. Create Sentry Account**
- Go to https://sentry.io/signup/
- Create new project → Select "Next.js"
- Copy DSN (looks like: `https://abc123@o123.ingest.sentry.io/456`)

**2. Install Sentry**
```bash
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**3. Configure Sentry** (wizard creates these files)

`sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  environment: process.env.VERCEL_ENV || 'development',
});
```

`sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.VERCEL_ENV || 'development',
});
```

**4. Add to `.env.local`**
```bash
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
```

**5. Test Error Tracking**

Create `src/app/api/test-error/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('Test Sentry error tracking');
}
```

Visit `http://localhost:3000/api/test-error` → Check Sentry dashboard for error

**6. Add to `.gitignore`**
```bash
# Sentry
.sentryclirc
sentry.properties
```

**Deliverable:** ✅ Sentry configured and tracking errors

---

### Prerequisite 4: User Limit Enforcement (1 hour)

**Why:** PRD specifies max 10 users; prevent overflow before first public deployment.

**Steps:**

**1. Create User Count Check Utility**

Create `src/lib/user-limit.ts`:
```typescript
import { prisma } from './prisma';

const MAX_USERS = 10;

export async function isRegistrationOpen(email: string): Promise<boolean> {
  // Admin override (comma-separated emails in env var)
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (adminEmails.includes(email)) {
    return true;
  }

  // Check user count
  const userCount = await prisma.user.count();
  return userCount < MAX_USERS;
}

export async function getUserCount(): Promise<number> {
  return await prisma.user.count();
}

export async function getRemainingSlots(): Promise<number> {
  const count = await getUserCount();
  return Math.max(0, MAX_USERS - count);
}
```

**2. Create Registration Check API**

Create `src/app/api/auth/check-registration/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { isRegistrationOpen, getRemainingSlots } from '@/lib/user-limit';

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json(
      { error: 'Email required' },
      { status: 400 }
    );
  }

  const open = await isRegistrationOpen(email);
  const remaining = await getRemainingSlots();

  return NextResponse.json({
    open,
    remaining,
    maxUsers: 10,
  });
}
```

**3. Update NextAuth Configuration**

Modify `src/lib/auth.ts`:
```typescript
import { isRegistrationOpen } from './user-limit';

export const authOptions = {
  // ... existing config
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if registration is open for new users
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! },
      });

      // Allow existing users to sign in
      if (existingUser) {
        return true;
      }

      // Check if new registrations are allowed
      const canRegister = await isRegistrationOpen(user.email!);
      if (!canRegister) {
        // Redirect to registration closed page
        return '/registration-closed';
      }

      return true;
    },
    // ... existing callbacks
  },
};
```

**4. Create Registration Closed Page**

Create `src/app/registration-closed/page.tsx`:
```typescript
import { getRemainingSlots, getUserCount } from '@/lib/user-limit';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function RegistrationClosedPage() {
  const remaining = await getRemainingSlots();
  const current = await getUserCount();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Registration Closed</CardTitle>
          <CardDescription>
            Garden Optimus is currently at capacity ({current}/10 users).
          </CardDescription>
        </CardHeader>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            We're limiting early access to ensure the best experience for our users.
          </p>
          {remaining === 0 && (
            <p className="text-sm font-semibold">
              All slots are currently filled. Please check back later!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
```

**5. Add Admin Emails to `.env.local`**
```bash
ADMIN_EMAILS="your-email@example.com,admin@example.com"
```

**6. Test Registration Limit**
```bash
# Test API
curl -X POST http://localhost:3000/api/auth/check-registration \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Deliverable:** ✅ Registration stops at 10 users, admins can bypass

---

### Prerequisite 5: Initial Vercel Deployment (30 minutes)

**Why:** Establish baseline deployment before adding features; verify environment setup.

**Steps:**

**1. Push to GitHub**
```bash
git add .
git commit -m "Add prerequisites: Blob storage, Sentry, user limit"
git push origin main
```

**2. Import to Vercel**
- Visit https://vercel.com/new
- Import Git Repository → Select your GitHub repo
- Framework Preset: Next.js (auto-detected)
- Click "Deploy"

**3. Configure Environment Variables**

Vercel Dashboard → Settings → Environment Variables:

**Required for all phases:**
```bash
# Database
DATABASE_URL="postgresql://..."  # From Vercel Postgres

# Auth
NEXTAUTH_URL="https://your-project.vercel.app"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# OAuth Providers
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Storage
BLOB_READ_WRITE_TOKEN="<auto-added by Vercel Blob>"

# Error Monitoring
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."

# User Limit
ADMIN_EMAILS="your-email@example.com"
```

**4. Update OAuth Callback URLs**

**Google Cloud Console:**
- Authorized redirect URIs: `https://your-project.vercel.app/api/auth/callback/google`

**GitHub OAuth App:**
- Authorization callback URL: `https://your-project.vercel.app/api/auth/callback/github`

**5. Redeploy with Environment Variables**
- Vercel → Deployments → Latest → Three dots → Redeploy

**6. Run Database Migration**
```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Run migration on production DB
vercel env pull .env.production
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma migrate deploy
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma db seed
```

**7. Verify Deployment**
- Visit `https://your-project.vercel.app`
- Test login with Google/GitHub
- Check Sentry dashboard for any errors

**Deliverable:** ✅ App deployed to Vercel, accessible from any device

---

### Prerequisite Checklist

Before starting Phase 0 implementation, verify:

- [ ] **Database**: Vercel Postgres created, connected, seeded with species
- [ ] **Blob Storage**: `@vercel/blob` installed, `storage.ts` abstraction created
- [ ] **Upload/Delete APIs**: Updated to use `uploadPhoto()`/`deletePhoto()` helpers
- [ ] **Sentry**: Installed, configured, test error tracked successfully
- [ ] **User Limit**: `isRegistrationOpen()` check added to auth flow
- [ ] **Registration Closed Page**: Created at `/registration-closed`
- [ ] **Vercel Deployment**: App live at `your-project.vercel.app`
- [ ] **Environment Variables**: All required env vars set in Vercel dashboard
- [ ] **OAuth**: Google/GitHub callback URLs updated with Vercel URL
- [ ] **Database Migration**: Ran on production database
- [ ] **Test Login**: Successfully logged in via OAuth on production
- [ ] **Test Upload**: Uploaded photo works (uses Blob storage in production)

**Estimated Total Time: 3-4 hours**

---

## PHASE 0: Plant Entry & Species Identification (1 week)
**Goal:** Fix the plant adding workflow to make it usable for novice gardeners and enable AI-powered species identification.

### Current Problems
- Dropdown with 50+ species is unusable without search
- No way to filter/search as you type
- No visual aids (photos, descriptions) to help identify correct species
- No AI identification option (required by PRD)
- Difficult to add test plants with confidence

### Features
1. **Searchable Species Selection**
   - Replace dropdown with searchable combobox (shadcn/ui)
   - Type-ahead filtering by common name, scientific name, or description
   - Show species image thumbnail and description in search results
   - Display full species details (care requirements) on selection

2. **AI Plant Identification**
   - "Don't know the species?" button → photo upload flow
   - Camera capture support (HTML5 `capture="environment"`)
   - Send photo to Claude Vision API for identification
   - Parse response for species match
   - Auto-populate form with identified species
   - Fallback: Show top 3 matches for user to choose

3. **Enhanced Species Browsing**
   - "Browse Species Library" link from plant form
   - Filter by: Indoor/Outdoor, Light needs, Toxicity
   - Grid view with images and descriptions
   - "Select this species" button returns to form

4. **Improved Form UX**
   - Show selected species care requirements preview in form
   - Inline validation with helpful messages
   - "Add another plant" quick action after save

### Critical Requirements

**1. AI → Database Fuzzy Matching**
- AI returns "Monstera Deliciosa" but database has "Monstera" or "Swiss Cheese Plant"
- Implement fuzzy string matching using Fuse.js (already lightweight)
- Match against commonName, scientificName, AND aliases/common synonyms
- Threshold: >70% match confidence
- Show top 3 matches for user to choose if confidence < 90%

**2. Species Not in Library Handling**
- If AI identifies species not in seed data, offer options:
  - "Add as custom species" → save with AI-provided care recommendations
  - "Skip species selection" → save plant without species link
  - "Browse library manually" → fallback to combobox
- Track "custom species" separately for future library expansion

**3. Image Compression & Validation**
- Client-side compression before upload (browser-image-compression library)
- Target: Max 1MB, 1920px max dimension
- Validate: File type (JPEG/PNG/HEIC), max 10MB raw
- User guidance: "Take a clear, close-up photo of the plant leaves/stem"
- Show preview before AI identification

### Implementation

**Modified Components:**
- `src/components/plant-form.tsx` - Replace Select with Combobox, add AI identification button
- `src/app/species/page.tsx` - Add selection mode (currently just browsing)

**New Components:**
- `src/components/species-combobox.tsx` - Searchable species selector with thumbnails
- `src/components/ai-identify-button.tsx` - Photo upload → AI identification flow (with compression)
- `src/components/species-browser.tsx` - Filterable grid view for browsing species
- `src/components/species-preview-card.tsx` - Show care requirements after selection
- `src/components/species-match-picker.tsx` - Show multiple AI matches for user selection
- `src/components/custom-species-form.tsx` - Add custom species not in library

**New API Routes:**
- `src/app/api/species/search/route.ts` - GET: Search species by query string
- `src/app/api/species/identify/route.ts` - POST: AI plant identification from photo (rate limited: 10/hour/user)
- `src/app/api/species/custom/route.ts` - POST: Create custom species from AI data

**Modified API Routes:**
- `src/app/api/species/route.ts` - Add query params for filtering (location, lightNeeds, toxicity)

**New Utilities:**
- `src/lib/ai-identify.ts` - Claude Vision integration for plant identification
- `src/lib/species-search.ts` - Search/filter logic for species library
- `src/lib/species-matcher.ts` - Fuzzy matching between AI output and database (Fuse.js)
- `src/lib/image-compression.ts` - Client-side image compression and validation

### Database Changes
**NONE** - PlantSpecies.description field already exists (schema line 105)

### AI Identification Prompt Strategy
```typescript
// Send to Claude Vision API
const prompt = `Analyze this plant photo and identify the species.

Return ONLY valid JSON in this exact format:
{
  "species": "Common Name",
  "scientificName": "Scientific name",
  "confidence": "high|medium|low",
  "alternativeMatches": [
    {"species": "Alternative 1", "scientificName": "Alt 1 scientific"},
    {"species": "Alternative 2", "scientificName": "Alt 2 scientific"}
  ],
  "reasoning": "Brief explanation of identification"
}

Focus on common houseplants and garden plants.`;
```

### Testing
- Unit tests for species search/filter logic
- Component tests for Combobox interaction
- Integration test for AI identification flow
- Test with real plant photos (monstera, pothos, snake plant, etc.)
- Test fallback behavior when AI can't identify
- Test search performance with 50+ species

### Deployment
- Fully backward compatible (enhances existing form)
- No environment variables needed (uses existing ANTHROPIC_API_KEY)
- No database migration required (unless adding custom species support)
- Existing plants unaffected
- Install dependencies: `npm install fuse.js browser-image-compression`
- Rate limiting: 10 AI identification requests per hour per user (prevents API abuse)

---

## PHASE 1: Enhanced Dashboard (1-2 weeks)
**Goal:** Improve UX with better visual hierarchy and quick actions WITHOUT database changes or background jobs.

### Features
1. **Priority-Based Sorting & Filtering**
   - Sort care alerts by urgency: overdue → due-today → due-soon → upcoming
   - Add filter tabs: "All", "Overdue", "Due Today", "Upcoming"
   - Show count badges for each category
   - Paginated view: Show top 20 schedules, "Load more" button for additional
   - Virtual scrolling for users with 50+ schedules

2. **Enhanced Visual Indicators**
   - Color-coded cards based on urgency (red/yellow/green)
   - Progress indicators showing days since last care
   - Plant health status integration

3. **Improved Quick Actions**
   - Bulk "Mark as Done" for multiple tasks
   - "Snooze" functionality (reschedule by +1/3/7 days)
   - Quick notes on completion
   - Optimistic UI updates

4. **Dashboard Statistics Widget**
   - "Tasks completed this week" counter (calculated in user's timezone)
   - Streak tracking
   - "Next 7 days" preview calendar

5. **Empty States & Onboarding**
   - No plants: "Welcome! Add your first plant" with visual guide + CTA button
   - Plants exist but no schedules: "Set up care reminders to stay on track" with link to plant detail
   - All tasks complete: "Great job! 🎉 All plants are happy" celebration message
   - Progressive onboarding: Tooltips for first-time users on each feature

### Implementation

**New Components:**
- `src/components/enhanced-care-alerts.tsx` - Replaces CareAlerts with filtering, sorting, bulk actions, pagination
- `src/components/care-stats-widget.tsx` - Dashboard statistics with timezone support
- `src/components/bulk-care-actions.tsx` - Multi-select and bulk operations
- `src/components/snooze-button.tsx` - Snooze/reschedule UI
- `src/components/empty-state.tsx` - Reusable empty state with illustration + CTA
- `src/components/onboarding-tooltip.tsx` - First-time user guidance tooltips

**Modified Files:**
- `src/app/page.tsx` - Integrate EnhancedCareAlerts, CareStatsWidget, and empty states
- `src/components/quick-care-button.tsx` - Add optional notes parameter, optimistic updates

**New API Routes:**
- `src/app/api/care-schedules/bulk-complete/route.ts` - POST: Batch update multiple schedules
- `src/app/api/care-schedules/[id]/snooze/route.ts` - POST: Adjust nextDueDate

**New Utilities:**
- `src/lib/care-stats.ts` - Calculate streaks, completion rates, weekly stats (timezone-aware)
- `src/lib/pagination.ts` - Helper for paginated schedule queries

### Database Changes
**NONE** - Uses existing models

### Testing
- Unit tests for care-stats calculations
- Component tests for filtering, sorting, selection
- Integration tests for bulk API endpoints
- E2E test: Complete multiple tasks, verify stats update

### Deployment
- Fully backward compatible
- No environment variables needed
- Ensure bulk operations use transactions
- Performance: Database index on CareSchedule.nextDueDate already exists (schema line 149)
- Pagination default: 20 items per page (configurable)
- Virtual scrolling kicks in at 50+ schedules
- Empty state illustrations: Use Lucide icons or unsplash placeholder images

---

## PHASE 2: Notification Settings & User Preferences (1-2 weeks)
**Goal:** Build user preference management system to prepare for push notifications, with email notification fallback.

### Features
1. **Settings Page**
   - New `/settings` route with tabbed interface
   - Profile, Notifications, Location tabs

2. **Notification Preferences Model**
   - Enable/disable notifications globally
   - Per-channel: Push (future), Email (now), In-app (now)
   - Per-type: Care reminders, Weather alerts, Health assessments
   - Timing: Daily digest time, quiet hours
   - Frequency: Instant, Daily digest, Weekly digest

3. **In-App Notification Center**
   - Bell icon in header with unread count
   - Notification inbox (drawer/modal)
   - Mark as read/unread, dismiss
   - **Real-time updates**: Polling strategy (check every 60 seconds when page active)
   - Visual badge pulse animation on new notifications
   - "Mark all as read" bulk action

4. **Email Notifications (Fallback)**
   - Send email for overdue tasks
   - Daily digest email option
   - Email verification required before enabling (send confirmation link)
   - Handle bounces/unsubscribes

5. **Notification Retention Policy**
   - Auto-delete read notifications after 30 days
   - Keep unread notifications indefinitely (up to 100 max per user)
   - Weekly cleanup job

### Implementation

**New Pages:**
- `src/app/settings/page.tsx` - Settings layout with tabs
- `src/app/settings/notifications/page.tsx` - Notification preferences form

**New Components:**
- `src/components/notification-preferences-form.tsx` - Preferences UI
- `src/components/notification-center.tsx` - In-app notification inbox
- `src/components/notification-bell.tsx` - Header bell icon with badge

**Modified Files:**
- `src/components/header.tsx` - Add NotificationBell component
- `src/app/page.tsx` - Remove LocationPrompt (moved to settings)

**New API Routes:**
- `src/app/api/notifications/preferences/route.ts` - GET/PUT user preferences
- `src/app/api/notifications/route.ts` - GET: List notifications (paginated, unread first), POST: Create notification
- `src/app/api/notifications/[id]/route.ts` - PATCH: Mark read, DELETE: Dismiss
- `src/app/api/notifications/mark-all-read/route.ts` - POST: Bulk mark read
- `src/app/api/notifications/unread-count/route.ts` - GET: Fast unread count query (for polling)
- `src/app/api/notifications/verify-email/route.ts` - POST: Send verification email, GET: Verify token
- `src/app/api/cron/cleanup-notifications/route.ts` - DELETE: Remove old read notifications (run weekly)

**New Utilities:**
- `src/lib/email.ts` - Email sending via SMTP (optional, using nodemailer)
- `src/lib/notifications.ts` - Create notification helpers
- `src/lib/email-verification.ts` - Generate/validate email confirmation tokens

**New Hooks:**
- `src/hooks/use-notifications.ts` - Polling hook (checks API every 60s when page active)
- `src/hooks/use-page-visibility.ts` - Detect tab active/inactive to pause polling

### Database Changes

**New Models:**
```prisma
model NotificationPreferences {
  id                    String   @id @default(cuid())
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId                String   @unique

  // Global toggles
  pushEnabled           Boolean  @default(true)
  emailEnabled          Boolean  @default(false)
  emailVerified         Boolean  @default(false)
  inAppEnabled          Boolean  @default(true)

  // Per-type preferences
  careRemindersEnabled  Boolean  @default(true)
  weatherAlertsEnabled  Boolean  @default(true)
  assessmentsEnabled    Boolean  @default(true)

  // Timing
  dailyDigestEnabled    Boolean  @default(false)
  dailyDigestTime       String?  // e.g., "09:00"
  quietHoursStart       String?
  quietHoursEnd         String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Notification {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String

  type        NotificationType
  title       String
  message     String
  actionUrl   String?

  plantId     String?
  scheduleId  String?

  isRead      Boolean  @default(false)
  readAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
}

enum NotificationType {
  CARE_OVERDUE
  CARE_DUE_TODAY
  CARE_DUE_SOON
  WEATHER_ALERT
  HEALTH_ASSESSMENT_READY
}
```

**Update User model:**
```prisma
model User {
  // Add relations
  notificationPreferences NotificationPreferences?
  notifications          Notification[]
}
```

### Testing
- Unit tests for preference validation
- Component tests for settings forms
- API tests for preference CRUD
- Mock email sending

### Deployment
- **Migration required** for new models
- **Optional env vars:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (for email)
- Create default NotificationPreferences for existing users (migration seed)
- Polling strategy: 60-second interval, pauses when tab inactive (saves API calls)
- Retention cleanup: Weekly cron job to delete old notifications
- Email verification: Token-based (JWT with 24-hour expiry)

---

## PHASE 3: Push Notification Infrastructure (2-3 weeks)
**Goal:** Implement browser-based push notifications using Web Push API and service workers.

### Features
1. **Service Worker & PWA Setup**
   - Register service worker for push events
   - Add web app manifest for "Add to Home Screen"
   - Handle push subscription lifecycle
   - **PWA Assets**: Icons at 72, 96, 128, 144, 152, 192, 384, 512px (PNG)
   - Maskable icon support for Android
   - Apple touch icons for iOS

2. **VAPID Key Generation & Management**
   - Generate VAPID keys for Web Push
   - Store keys securely in environment

3. **Push Subscription Management**
   - Browser permission request flow with context ("Get reminders for your plants")
   - Store push subscriptions per user/device
   - Multi-device support
   - **Browser Compatibility Detection**: Show appropriate UI based on support
   - **Dead Subscription Cleanup**: Remove subscriptions after 3 failed deliveries

4. **Push Notification Sending**
   - Server-side push notification API
   - Use web-push library
   - Handle delivery failures gracefully
   - Retry logic: 3 attempts with exponential backoff

5. **Browser Compatibility Matrix**
   - ✅ Chrome/Edge (Desktop & Android): Full support
   - ✅ Firefox (Desktop & Android): Full support
   - ✅ Safari (Desktop): Supported (macOS 13+)
   - ⚠️ Safari (iOS): ONLY via PWA + Add to Home Screen
   - ❌ iOS Web Browser: Not supported, show fallback message
   - Show install prompt for iOS users with instructions

### Implementation

**New Files:**
- `public/service-worker.js` - Push event handling, notification display
- `public/manifest.json` - PWA manifest
- `public/icons/` - PWA icons at multiple resolutions (72-512px)
- `public/apple-touch-icon.png` - iOS home screen icon (180x180px)

**New Components:**
- `src/components/push-notification-prompt.tsx` - Permission request UI with context
- `src/components/install-pwa-prompt.tsx` - iOS/PWA install banner with instructions
- `src/components/browser-compatibility-banner.tsx` - Show support status per browser
- `src/components/push-subscription-manager.tsx` - Manage devices/subscriptions UI

**Modified Files:**
- `src/app/layout.tsx` - Register service worker, add manifest link
- `src/app/settings/notifications/page.tsx` - Add push subscription toggle, manage devices

**New API Routes:**
- `src/app/api/push/subscribe/route.ts` - POST: Save push subscription
- `src/app/api/push/unsubscribe/route.ts` - POST: Remove push subscription
- `src/app/api/push/send/route.ts` - POST: Send push notification (internal, with retry logic)
- `src/app/api/push/vapid-public-key/route.ts` - GET: Return public VAPID key
- `src/app/api/push/test/route.ts` - POST: Send test notification to current user
- `src/app/api/cron/cleanup-push-subscriptions/route.ts` - DELETE: Remove dead subscriptions (run daily)

**New Utilities:**
- `src/lib/push.ts` - Web Push sending logic with retry and failure tracking
- `src/lib/vapid.ts` - VAPID key management
- `src/lib/browser-detection.ts` - Detect browser capabilities for push notifications
- `src/hooks/use-push-subscription.ts` - Client-side subscription hook
- `src/hooks/use-install-prompt.ts` - PWA install prompt management

### Database Changes

**New Model:**
```prisma
model PushSubscription {
  id              String   @id @default(cuid())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String

  endpoint        String   @unique
  p256dh          String   // Public key
  auth            String   // Auth secret

  userAgent       String?
  deviceName      String?

  failureCount    Int      @default(0)
  lastFailureAt   DateTime?
  lastSuccessAt   DateTime?

  lastUsed        DateTime @default(now())
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([failureCount]) // For cleanup queries
}
```

**Update User model:**
```prisma
model User {
  pushSubscriptions PushSubscription[]
}
```

### Testing
- Test service worker registration
- Mock push subscription (MSW)
- Test VAPID key generation
- Manual testing on Chrome, Firefox, Safari (iOS)
- Test multi-device scenarios

### Deployment
- **Migration required** (add failureCount, lastFailureAt, lastSuccessAt fields)
- **Required env vars:**
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT` (e.g., "mailto:admin@garden-optimus.com")
- Generate keys: `npx web-push generate-vapid-keys`
- **PWA Icon Generation**: Use https://realfavicongenerator.net/ or `pwa-asset-generator`
- Service worker requires HTTPS (or localhost)
- Install dependencies: `npm install web-push`
- Update `next.config.ts` for service worker
- **Dead Subscription Cleanup**: Daily cron removes subscriptions with failureCount >= 3
- Test push notifications on multiple browsers before launch

---

## PHASE 4: Automated Notifications & Daily Digest (1-2 weeks)
**Goal:** Implement scheduled background jobs for automated notifications.

### Features
1. **Scheduled Job Infrastructure**
   - Use Vercel Cron or external cron service (cron-job.org, EasyCron)

2. **Daily Digest Job**
   - Runs hourly, checks each user's timezone + digest time preference
   - Aggregates: Overdue tasks, tasks due today/tomorrow, upcoming this week
   - Weather forecast for outdoor plants
   - Send via: Push (primary), Email (fallback), In-app (always)
   - **Idempotency**: Check `lastNotifiedAt` on CareSchedule to prevent duplicate digests

3. **Instant Care Reminders**
   - Check hourly for schedules that became overdue/due-today
   - **Duplicate Prevention**: Only notify if `lastNotifiedAt` is NULL or > 24 hours ago
   - **Notification Fatigue Prevention**: Batch and prioritize
     - Group by care type: "3 plants need watering" instead of 3 separate notifications
     - Prioritize top 5 most urgent plants (by days overdue)
     - Show count of remaining: "...and 15 more plants need care"
   - Respect quiet hours

4. **Weather-Based Alerts**
   - Check weather API 2x daily (6 AM, 6 PM user local time)
   - Trigger thresholds:
     - Frost warning: < 2°C (35°F) and user has outdoor plants
     - Heatwave: > 35°C (95°F) and user has outdoor plants
     - Heavy rain: > 50mm precipitation expected
   - Only notify if user has outdoor plants
   - Context-aware: Check plant location (INDOOR vs OUTDOOR)

5. **Smart Notification Throttling**
   - Max 1 instant reminder per schedule per 24 hours
   - Max 1 daily digest per user per 24 hours
   - Track `lastNotifiedAt` per CareSchedule
   - Update `notificationCount` for analytics
   - Quiet hours handling: Queue notifications until quiet hours end

### Implementation

**New Cron Routes:**
- `src/app/api/cron/daily-digest/route.ts` - Daily digest job
- `src/app/api/cron/check-reminders/route.ts` - Hourly reminder check
- `src/app/api/cron/check-weather/route.ts` - Twice-daily weather check

**New Utilities:**
- `src/lib/digest.ts` - Aggregate digest data with timezone awareness
- `src/lib/notification-sender.ts` - Unified notification sending (push + email + in-app)
- `src/lib/cron-auth.ts` - Secure cron endpoints with secret token
- `src/lib/notification-batching.ts` - Group and prioritize notifications to prevent fatigue
- `src/lib/quiet-hours.ts` - Calculate quiet hours across midnight edge cases
- `src/lib/deduplication.ts` - Check if notification was recently sent (idempotency)

**Modified Files:**
- `src/lib/push.ts` - Add digest notification formatting
- `src/lib/email.ts` - Add digest email template
- `public/service-worker.js` - Handle notification actions (mark as done, snooze)

### Database Changes

**Update CareSchedule:**
```prisma
model CareSchedule {
  // Add notification tracking
  lastNotifiedAt    DateTime?
  notificationCount Int @default(0)
}
```

**New Model:**
```prisma
model NotificationLog {
  id              String   @id @default(cuid())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId          String

  type            NotificationType
  channel         NotificationChannel

  title           String
  message         String

  status          DeliveryStatus
  sentAt          DateTime @default(now())
  deliveredAt     DateTime?
  failureReason   String?

  scheduleId      String?
  plantId         String?

  @@index([userId, sentAt])
  @@index([scheduleId])
}

enum NotificationChannel {
  PUSH
  EMAIL
  IN_APP
}

enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
}
```

**Update User model:**
```prisma
model User {
  notificationLogs NotificationLog[]
}
```

### Testing
- Unit tests for digest aggregation
- Test timezone calculations
- Mock cron triggers
- Test notification throttling
- Integration test: Cron → notification created
- Test quiet hours enforcement

### Deployment
- **Migration required**
- **Required env vars:**
  - `CRON_SECRET` - Secure cron endpoints
  - All from Phase 2 & 3
- **Vercel Cron Configuration:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/check-weather",
      "schedule": "0 6,18 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 */1 * * *"
    }
  ]
}
```

- **Security:** Validate `CRON_SECRET` header in all cron endpoints
- **Monitoring:**
  - Log all cron executions with timestamp and result count
  - Track notification delivery success/failure rates
  - Alert if cron job fails or delivery rate < 80%
- **Timezone handling:** Use `date-fns-tz` for accurate timezone calculations
- **Quiet hours edge case:** Handle ranges like "22:00-08:00" that span midnight
- **Idempotency**: All cron jobs check `lastNotifiedAt` before sending
- **Weather thresholds**: Configurable per alert type (frost < 2°C, heat > 35°C, rain > 50mm)
- **Batching strategy**: Group by care type, show top 5, count remainder

---

## Deployment & Production Setup (Vercel)

### Overview
Comprehensive guide for deploying Garden Optimus to Vercel for multi-device access via vercel.app subdomain.

### Prerequisites
- GitHub account with Garden Optimus repository
- Vercel account (free tier works for 10 users)
- Production database provider account

---

### Step 1: Production Database Setup

**Recommended Option: Vercel Postgres**
- Built-in integration with Vercel
- Automatic connection pooling (PgBouncer)
- Free tier: 256 MB storage, 60 compute hours/month (sufficient for 10 users)

**Alternative Options:**
- **Neon**: Generous free tier, serverless Postgres
- **Supabase**: Free tier with 500MB database + built-in auth
- **Railway**: $5/month, simple setup

**Setup Steps (Vercel Postgres):**
1. Go to Vercel dashboard → Storage → Create Database → Postgres
2. Select project to connect
3. Vercel automatically adds these env vars:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` (use this for `DATABASE_URL`)
   - `POSTGRES_URL_NON_POOLING`
4. Update `.env.local` locally for testing:
   ```bash
   DATABASE_URL="postgres://..."  # Copy from Vercel
   ```

**Database Migrations Workflow:**
1. **Development**: Use `npm run db:push` for schema changes
2. **Production**:
   ```bash
   # Generate migration
   npx prisma migrate dev --name add_feature_x

   # Deploy to production (runs automatically on Vercel deploy)
   # Or manually:
   npx prisma migrate deploy
   ```
3. **Seed Production DB** (one-time):
   ```bash
   # After first deploy
   vercel env pull .env.production
   DATABASE_URL="$(grep DATABASE_URL .env.production)" npx prisma db seed
   ```

**Backup Strategy:**
- Vercel Postgres: Automatic daily backups (retained 7 days on free tier)
- Manual backup: `pg_dump` via connection string
- Export critical data periodically via Prisma Studio

---

### Step 2: File Storage Migration (Critical for Vercel)

**Problem:** `public/uploads/` doesn't work on Vercel (read-only filesystem on serverless)

**Solution: Vercel Blob Storage**
- Free tier: 500MB storage, 1GB bandwidth/month
- Automatic CDN distribution
- Simple API

**Setup:**
1. Vercel dashboard → Storage → Create Blob Store
2. Connect to project (adds `BLOB_READ_WRITE_TOKEN` env var)
3. Install SDK: `npm install @vercel/blob`

**Code Changes Required:**

**New Utility:**
```typescript
// src/lib/blob-storage.ts
import { put, del } from '@vercel/blob';

export async function uploadPlantPhoto(file: File, plantId: string) {
  const filename = `${plantId}-${Date.now()}.${file.name.split('.').pop()}`;
  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: false,
  });
  return blob.url; // CDN URL
}

export async function deletePhoto(url: string) {
  await del(url);
}
```

**Update These Files:**
- `src/app/api/upload/route.ts` - Replace fs operations with Blob upload
- `src/app/api/photos/[id]/route.ts` - Delete from Blob instead of filesystem
- `src/app/api/assessments/route.ts` - Upload assessment photos to Blob

**Environment Detection:**
```typescript
// src/lib/storage.ts
const USE_BLOB_STORAGE = process.env.VERCEL === '1' || process.env.USE_BLOB_STORAGE === 'true';

export const uploadPhoto = USE_BLOB_STORAGE ? uploadToBlob : uploadToLocal;
```

**Migration Plan:**
- Phase 0 implementation: Add Blob storage support
- Keep local storage for development
- Use env var to switch between local/blob

---

### Step 3: Vercel Project Setup

**Initial Deployment:**

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import GitHub repository
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Click "Deploy"

3. **Initial deploy will fail** (missing env vars) - this is expected

**Configure Environment Variables:**

Go to Project Settings → Environment Variables, add:

**Required (All Environments):**
```bash
# Database
DATABASE_URL="postgresql://..."  # From Vercel Postgres or your provider

# Auth (NextAuth)
NEXTAUTH_URL="https://your-project.vercel.app"  # Use your Vercel URL
NEXTAUTH_SECRET="your-generated-secret"  # Generate: openssl rand -base64 32

# OAuth Providers
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_..."  # Auto-added if using Vercel Blob
```

**Optional (Phase-specific):**
```bash
# Phase 2: Email Notifications
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Garden Optimus <notifications@garden-optimus.vercel.app>"

# Phase 3: Push Notifications
VAPID_PUBLIC_KEY="BN..."  # Generate: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@youremail.com"

# Phase 4: Cron Jobs
CRON_SECRET="your-random-secret"  # Generate: openssl rand -hex 32

# Error Monitoring
SENTRY_DSN="https://...@sentry.io/..."
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."

# User Limit
ADMIN_EMAILS="admin@example.com,owner@example.com"  # Comma-separated
```

**Environment Variable Best Practices:**
- Production: Set to "Production" environment
- Preview: Optional, for staging branches
- Development: Leave empty (use local `.env.local`)

**Redeploy after adding env vars:**
- Vercel → Deployments → Three dots → Redeploy

---

### Step 4: Vercel Configuration Files

**Create `vercel.json` in project root:**
```json
{
  "buildCommand": "prisma generate && next build",
  "rewrites": [
    {
      "source": "/service-worker.js",
      "destination": "/_next/static/service-worker.js"
    }
  ],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    }
  ]
}
```

**Vercel Cron Jobs (Phase 4):**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/check-weather",
      "schedule": "0 6,18 * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 */1 * * *"
    },
    {
      "path": "/api/cron/cleanup-notifications",
      "schedule": "0 2 * * 0"
    },
    {
      "path": "/api/cron/cleanup-push-subscriptions",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Update `.gitignore`:**
```
.env*.local
.vercel
.env.production
```

---

### Step 5: Database Migration on Deploy

**Automatic Migrations:**

Create `package.json` script:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

**Manual Migration (if needed):**
```bash
# Install Vercel CLI
npm i -g vercel

# Pull production env vars
vercel env pull .env.production

# Run migration
npx prisma migrate deploy

# Or connect directly
vercel env pull
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma migrate deploy
```

---

### Step 6: Error Monitoring Setup (Sentry)

**Installation:**
```bash
npm install --save @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration (auto-generated by wizard):**

`sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.VERCEL_ENV || 'development',
});
```

`sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.VERCEL_ENV || 'development',
});
```

**Add to Vercel env vars:**
- `SENTRY_DSN` (Server-side)
- `NEXT_PUBLIC_SENTRY_DSN` (Client-side)
- `SENTRY_AUTH_TOKEN` (for source maps - optional)

---

### Step 7: Multi-Device Access & PWA Installation

**Access Your App:**
- **URL**: `https://your-project-name.vercel.app`
- Share this URL for multi-device access
- Works on desktop, mobile browsers, tablets

**PWA Installation Instructions:**

**Android (Chrome/Edge):**
1. Open `https://your-project.vercel.app` in Chrome
2. Tap three dots → "Add to Home screen"
3. App appears as standalone app
4. Push notifications work immediately

**iOS (Safari):**
1. Open `https://your-project.vercel.app` in Safari
2. Tap Share button → "Add to Home Screen"
3. App appears as standalone app
4. ⚠️ Push notifications ONLY work when installed as PWA

**Desktop (Chrome/Edge):**
1. Open `https://your-project.vercel.app`
2. Look for install icon in address bar (or three dots → Install)
3. App opens as desktop app

**Show Installation Banner:**

Create `src/components/install-app-banner.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';

export function InstallAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50">
      <p className="font-semibold">Install Garden Optimus</p>
      <p className="text-sm">Get the best experience with our app!</p>
      <div className="flex gap-2 mt-2">
        <button onClick={handleInstall} className="px-4 py-2 bg-white text-green-600 rounded">
          Install
        </button>
        <button onClick={() => setShowBanner(false)} className="px-4 py-2 border border-white rounded">
          Later
        </button>
      </div>
    </div>
  );
}
```

Add to `src/app/layout.tsx`:
```typescript
import { InstallAppBanner } from '@/components/install-app-banner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <InstallAppBanner />
      </body>
    </html>
  );
}
```

---

### Step 8: Production Checklist

**Before First Deploy:**
- [ ] Database created and connected
- [ ] All required env vars set in Vercel
- [ ] OAuth providers configured with production callback URLs
- [ ] Blob storage configured for file uploads
- [ ] Prisma migrations ready
- [ ] `.gitignore` updated (no secrets in git)

**After First Deploy:**
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Seed production database: `npx prisma db seed`
- [ ] Test OAuth login with Google/GitHub
- [ ] Upload test plant photo (verify Blob storage works)
- [ ] Check error tracking in Sentry
- [ ] Verify app loads on mobile device

**Phase-Specific Deployment:**

**Phase 0 (Plant Entry):**
- [ ] Verify AI identification works (ANTHROPIC_API_KEY set)
- [ ] Test species search and combobox
- [ ] Upload plant photo from mobile camera
- [ ] Verify Blob storage URL returns image

**Phase 1 (Dashboard):**
- [ ] Test care alerts load and filter
- [ ] Verify pagination works with 20+ schedules
- [ ] Check empty states render correctly

**Phase 2 (Notifications):**
- [ ] SMTP credentials configured
- [ ] Test email sending (check spam folder)
- [ ] Verify in-app notifications appear
- [ ] Test email verification flow

**Phase 3 (Push Notifications):**
- [ ] VAPID keys generated and set
- [ ] Service worker registers correctly
- [ ] Test push subscription on Chrome desktop
- [ ] Test push subscription on Android Chrome
- [ ] Test PWA installation on iOS (Add to Home Screen)
- [ ] Send test push notification

**Phase 4 (Cron Jobs):**
- [ ] Verify Vercel Cron is configured (`vercel.json`)
- [ ] CRON_SECRET set and validated in endpoints
- [ ] Check Vercel → Settings → Cron Jobs (shows scheduled jobs)
- [ ] Monitor first cron execution in logs
- [ ] Verify notifications sent at correct times

---

### Step 9: Monitoring & Maintenance

**Vercel Dashboard Monitoring:**
- **Deployments**: View build logs, deployment status
- **Analytics**: Page views, web vitals (Core Web Vitals)
- **Logs**: Runtime logs, function logs (last 24 hours on free tier)
- **Cron Jobs**: Execution history, success/failure

**Sentry Monitoring:**
- Error tracking with stack traces
- Performance monitoring (slow API routes)
- User impact (how many users affected)
- Alerts: Email/Slack when error rate spikes

**Database Monitoring:**
- Vercel Postgres dashboard: Query performance, storage usage
- Prisma Studio: Browse data, run queries
- Connection pooling: Monitor active connections

**Health Check Endpoint:**

Create `src/app/api/health/route.ts`:
```typescript
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check env vars
    const envCheck = {
      database: !!process.env.DATABASE_URL,
      auth: !!process.env.NEXTAUTH_SECRET,
      ai: !!process.env.ANTHROPIC_API_KEY,
    };

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: envCheck,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 }
    );
  }
}
```

Use UptimeRobot or similar to ping `/api/health` every 5 minutes.

---

### Step 10: Troubleshooting Common Issues

**Issue: Build fails with "Prisma Client not generated"**
```bash
# Solution: Update build script
"build": "prisma generate && next build"
```

**Issue: Database connection timeout**
```bash
# Solution: Use pooled connection
DATABASE_URL="${POSTGRES_PRISMA_URL}"  # Not POSTGRES_URL
```

**Issue: File uploads fail (500 error)**
```bash
# Solution: Check Blob storage configured
# Verify BLOB_READ_WRITE_TOKEN is set
# Check upload code uses @vercel/blob
```

**Issue: Push notifications don't work**
```bash
# Solution:
# 1. Verify HTTPS (Vercel provides this)
# 2. Check VAPID keys are set
# 3. Test with Chrome DevTools → Application → Service Workers
```

**Issue: OAuth redirect fails**
```bash
# Solution: Update OAuth provider callback URLs
# Google: https://your-project.vercel.app/api/auth/callback/google
# GitHub: https://your-project.vercel.app/api/auth/callback/github
```

**Issue: Cron jobs not running**
```bash
# Solution:
# 1. Check vercel.json has "crons" array
# 2. Verify endpoints validate CRON_SECRET header
# 3. Check Vercel → Settings → Cron Jobs dashboard
```

---

### Step 11: Cost Estimation (Vercel Free Tier)

**What's Included:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless function executions: 100GB-hours compute time
- Vercel Postgres: 256MB storage, 60 compute hours
- Vercel Blob: 500MB storage, 1GB bandwidth
- Vercel Cron: Unlimited jobs

**For 10 Users:**
- **Bandwidth**: ~10-20GB/month (well within limit)
- **Database**: ~50-100MB (within 256MB)
- **Blob Storage**: ~100-200MB for plant photos (within 500MB)
- **Serverless Functions**: Minimal usage with proper optimization

**When to Upgrade to Pro ($20/month):**
- Need more than 100GB bandwidth
- Database > 256MB
- Want deployment protection (password-protected previews)
- Need longer log retention

**External Costs:**
- **Anthropic API**: ~$3-5/month for 100 AI identifications
- **Email (SMTP)**: Free with Gmail, ~$0-5/month with SendGrid
- **Sentry**: Free tier (5k events/month) sufficient for 10 users
- **Custom Domain**: $10-15/year (optional, not in current plan)

**Total Estimated Monthly Cost: $0-10** (mostly Anthropic API usage)

---

### Step 12: Deployment Workflow

**Development → Production Flow:**

1. **Local Development**
   ```bash
   npm run dev  # Test locally
   npm run build  # Verify build works
   npm run test  # Run tests
   ```

2. **Commit & Push**
   ```bash
   git add .
   git commit -m "Add feature X"
   git push origin main
   ```

3. **Automatic Deployment**
   - Vercel detects push to `main`
   - Runs build automatically
   - Deploys to production
   - Updates `your-project.vercel.app`

4. **Preview Deployments** (for feature branches)
   ```bash
   git checkout -b feature/new-feature
   git push origin feature/new-feature
   # Vercel creates preview URL: feature-new-feature.vercel.app
   ```

5. **Rollback if Needed**
   - Vercel → Deployments → Previous deployment → Promote to Production

**CI/CD Best Practices:**
- Use feature branches for development
- Test preview deployments before merging
- Merge to `main` only when ready for production
- Monitor Vercel deployment logs for errors

---

## Cross-Cutting Concerns

### Error Monitoring & Observability
**When to Implement:** During Phase 0 (before any other work)

**Setup:**
- Install Sentry or similar: `npm install @sentry/nextjs`
- Configure in `sentry.client.config.ts` and `sentry.server.config.ts`
- Track: API errors, component errors, unhandled promise rejections
- Context: User ID, plant ID, browser info
- Alert on: Error rate > 5%, specific critical errors (auth failures, AI API errors)

**Environment Variables:**
- `SENTRY_DSN` or equivalent
- `NEXT_PUBLIC_SENTRY_DSN`

### 10 User Limit Enforcement
**When to Implement:** Before Phase 0 (prevents overflow)

**Implementation:**
- Add middleware check on `/api/auth/[...nextauth]` signup flow
- Query total user count before creating new user
- If count >= 10, return "Registration closed" error
- Show waiting list form instead of sign up
- Admin override: `ADMIN_EMAILS` env var bypasses limit

**New Components:**
- `src/components/registration-closed.tsx` - Waiting list form
- `src/middleware.ts` - Add user limit check (or extend existing middleware)

**New API Route:**
- `src/app/api/auth/check-registration-open/route.ts` - GET: Returns if registration is open

**Database Query:**
```typescript
const userCount = await prisma.user.count();
if (userCount >= 10 && !isAdminEmail(email)) {
  return { error: "Registration is currently closed" };
}
```

---

## Phase Summary

| Phase | Duration | Risk | Value | Dependencies |
|-------|----------|------|-------|--------------|
| 0: Plant Entry & Identification | 1 week | Low | Critical | None |
| 1: Enhanced Dashboard | 1-2 weeks | Low | High | Phase 0 (for testing) |
| 2: Settings & Preferences | 1-2 weeks | Low-Medium | High | None |
| 3: Push Notifications | 2-3 weeks | Medium | High | Phase 2 |
| 4: Automated Notifications | 1-2 weeks | Medium | High | Phase 2, 3 |

**Total: 6-10 weeks**

---

## Key Critical Files

**Phase 0:**
- `src/components/plant-form.tsx` - Replace dropdown with searchable combobox
- `src/app/species/page.tsx` - Add selection mode
- `src/lib/ai.ts` - Existing Claude API integration (extend for identification)

**Phase 1:**
- `src/components/care-alerts.tsx` - Current implementation to enhance
- `src/app/page.tsx` - Dashboard integration
- `src/lib/care-reminders.ts` - Core logic to extend

**Phase 2:**
- `prisma/schema.prisma` - Add NotificationPreferences, Notification models
- `src/components/header.tsx` - Add notification bell

**Phase 3:**
- `public/service-worker.js` - NEW: Push handling
- `src/app/layout.tsx` - Register service worker
- `prisma/schema.prisma` - Add PushSubscription model

**Phase 4:**
- `src/app/api/care-schedules/route.ts` - Reference for querying schedules
- `src/lib/weather.ts` - Weather alert logic reference
- `prisma/schema.prisma` - Add notification tracking to CareSchedule

---

## Verification & Testing

### Phase 0 End-to-End Test
1. Navigate to `/plants/new`
2. Click on species combobox, start typing "monstera"
3. Verify filtered results appear with images/descriptions
4. Select a species, verify care requirements preview appears
5. Click "Don't know the species?" button
6. Upload/capture a plant photo (test with monstera image)
7. Verify AI identifies species correctly
8. Verify form auto-populates with identified species
9. Complete form and save plant
10. Browse species library with filters (Indoor/High light)
11. Select species from browser, verify returns to form

### Phase 1 End-to-End Test
1. Log in and view dashboard
2. Verify care alerts are sorted by priority (overdue first)
3. Filter by "Overdue" - should only show red items
4. Select multiple tasks and click "Mark All Done"
5. Verify stats widget shows completion count
6. Click snooze on a task, verify nextDueDate updated

### Phase 2 End-to-End Test
1. Navigate to `/settings`
2. Toggle notification preferences (in-app, email)
3. Save preferences, verify persisted in database
4. Trigger an in-app notification (manually via API)
5. Verify bell icon shows unread count
6. Open notification center, mark as read
7. Optional: Configure SMTP, verify email received

### Phase 3 End-to-End Test
1. Navigate to settings → notifications
2. Click "Enable Push Notifications"
3. Accept browser permission prompt
4. Verify subscription saved in database
5. Send test push notification (via API)
6. Verify notification appears in browser
7. Test on multiple devices (Chrome desktop, Chrome mobile, Safari iOS with PWA)

### Phase 4 End-to-End Test
1. Set daily digest time to current time + 5 minutes
2. Create overdue care schedules
3. Wait for cron job to run (or trigger manually)
4. Verify digest notification received (push + in-app)
5. Check NotificationLog for delivery status
6. Verify quiet hours respected (set quiet hours, trigger cron, no notification)
7. Test weather alert: Outdoor plant + frost warning → notification

---

## Implementation Notes

- **START WITH CROSS-CUTTING CONCERNS**: Set up error monitoring and user limit enforcement BEFORE Phase 0
- Each phase is independently deployable and testable
- **Phase 0 is foundational** - improves core UX and enables proper testing of subsequent phases
- All new code follows existing patterns (shadcn/ui, Server Components, Prisma)
- Error handling: graceful degradation (AI identification fails → manual selection, push fails → in-app notification)
- Accessibility: all components WCAG 2.1 AA compliant
- Dark mode: all new components support existing dark mode
- Mobile responsive: all UI tested on mobile viewports
- Camera integration: HTML5 capture API for native camera access on mobile
- Rate limiting: Applied to AI identification (10/hour), email sending (20/hour), push notifications (100/hour)
- Performance: Pagination, lazy loading, indexed queries throughout
