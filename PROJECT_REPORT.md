# ALNOVA Project Report

Generated: 2026-11-01

## 1. Product overview

ALNOVA is a Next.js and Supabase alumni mentorship platform. It connects students with alumni for mentorship, resume reviews, referrals, sessions, and direct messaging. Teachers have a separate operational role for publishing announcements and viewing alumni performance and student-association metrics.

## 2. Technology stack

- Next.js 16.3.1 App Router
- React 19.2.8
- TypeScript 5
- Supabase Auth, Postgres, Row Level Security, Realtime, and Storage
- Supabase SSR helpers for server/client authentication
- Tailwind CSS 4
- React Hook Form and Zod for forms and validation
- Lucide React for icons
- Sonner for toast notifications
- ESLint with `eslint-config-next`

## 3. Application structure

- `src/app/(auth)/`: registration, login, password reset, and onboarding.
- `src/app/(dashboard)/`: authenticated application routes.
- `src/components/dashboard/`: shared dashboards, navigation, and chat.
- `src/components/student/`: student request modals.
- `src/components/ui/`: reusable UI primitives.
- `src/lib/`: Supabase clients, date helpers, and utility functions.
- `src/lib/supabase/`: canonical browser, server, and proxy Supabase helpers.
- `src/types/`: application and database-oriented TypeScript models.
- `supabase/migrations/`: incremental database changes.
- `supabase/reset_schema.sql`: destructive, auth-preserving reference schema reset.

## 4. User roles

### Student

Student onboarding collects profile information and target roles. Students can:

- View a student dashboard.
- Browse the alumni directory.
- Search/filter alumni.
- Send mentorship, resume-review, and referral requests.
- Track mentorship sessions.
- Upload resumes for review.
- Message alumni connections.
- View teacher announcements.
- Edit their profile and avatar.

Student desktop navigation currently includes Dashboard, Alumni Directory, Session Tracker, Messages, Announcements, and Profile. The requests page remains implemented and can still be reached by dashboard actions or direct URL, but it was removed from the primary student navigation because the user requested that it not appear there.

### Alumni

Alumni onboarding collects professional profile information. Alumni can:

- View an alumni dashboard.
- See and respond to student requests.
- Browse the directory.
- View their connected/requesting students.
- Manage mentorship, resume, and referral workflows.
- Message students.
- View announcements.
- Edit their profile, professional details, and avatar.

### Teacher

Teacher onboarding is intentionally shorter than student/alumni onboarding and does not include skills.

Teacher navigation includes only:

- Teacher Dashboard
- Announcements
- Profile

Teachers can:

- View an alumni performance leaderboard.
- See how many students are associated with each alumni.
- See active and completed connections.
- See pending request totals.
- Identify the top-performing alumni.
- Create, edit, and delete announcements.
- Set announcement priority: normal, important, or urgent.
- Set an event date and time.
- Upload an optional PNG, JPEG, or WebP poster up to 5 MB.

Teacher access to `/messages` redirects to `/teacher-dashboard`. Teacher messaging UI was removed from navigation because the requested product direction was to replace it with analytics.

## 5. Main routes

### Public/auth routes

- `/`: landing page.
- `/register`: account registration.
- `/login`: authentication and role-based routing.
- `/forgot-password`: password reset request.
- `/reset-password`: password update.
- `/onboarding`: role selection and profile completion.

### Student routes

- `/dashboard/student`
- `/student-dashboard` compatibility redirect/page
- `/alumni`
- `/directory`
- `/dashboard/student/sessions`
- `/messages`
- `/profile`
- `/announcements`

### Alumni routes

- `/alumni-dashboard`
- `/directory`
- `/requests`
- `/messages`
- `/profile`
- `/announcements`

### Teacher routes

- `/teacher-dashboard`
- `/announcements`
- `/profile`

## 6. Core database model

The reference schema in `supabase/reset_schema.sql` contains:

- `users`: auth-linked account and role.
- `profiles`: shared profile data.
- `student_profiles`: student-specific data.
- `alumni_profiles`: alumni-specific data.
- `requests`: student-to-alumni requests with type and status.
- `skills` and `profile_skills`: skill catalog and profile associations.
- `conversations`: student/alumni conversations.
- `conversation_participants`: legacy participant tracking table.
- `messages`: conversation messages.
- `mentorship_sessions`: scheduled mentorship sessions.
- `resume_reviews`: resume review workflow.
- `referral_requests`: referral workflow.
- `alumni_availability`: alumni time slots.
- `announcements`: teacher announcements.

The current announcements schema includes:

- `title`
- `content`
- `poster_url`
- `event_date`
- `priority`
- `author_id`
- timestamps

Storage buckets include resumes and announcement posters.

## 7. Implemented Supabase migrations

- `00_init.sql`: original users, profiles, requests, auth trigger, and base policies.
- `01_storage.sql`: resume storage bucket and policies.
- `02_student_module.sql`: conversations, sessions, alumni availability, and messaging policies.
- `03_phase3_production_schema.sql`: expanded production-oriented schema.
- `04_teacher_announcements.sql`: teacher announcement table/fields/RLS.
- `05_repair_auth_user_trigger.sql`: repairs the auth user trigger.
- `06_teacher_alumni_messaging.sql`: teacher messaging policies from the earlier product direction.
- `07_repair_conversations_for_teacher_messaging.sql`: conversation schema repair.
- `08_fix_conversation_participant_rls.sql`: attempts to repair recursive participant policies.
- `09_remove_unused_participant_rls.sql`: removes obsolete participant RLS behavior.
- `10_announcement_posters.sql`: poster column, storage bucket, and poster policies.
- `11_teacher_dashboard_access.sql`: teacher read access to request relationships.
- `12_announcement_priority.sql`: adds missing priority and event date columns and priority validation.
- `13_notifications.sql`: adds the notification table, RLS, Realtime publication, and notification triggers.

## 8. Compatibility work already completed

The live database has existed in more than one schema shape. The application therefore contains compatibility handling for:

- Earlier versions supported `profiles.user_id` versus legacy `profiles.id`; Phase 1 standardizes active application queries on `profiles.user_id`.
- Role lookup from both `users.role` and `profiles.role`.
- Older announcements tables missing `priority` and `event_date`.
- Older request tables missing `status`.
- Legacy profile lookups when author names cannot be found through `user_id`.
- Authentication/profile redirect loops.

This Compatibility behavior was added because SQL migration files are not automatically executed by the application. The current Phase 1 code now targets the standardized `profiles.user_id` schema.

Phase 1 now standardizes application profile lookups on `profiles.user_id` and removes the duplicate Supabase helper directories. The canonical helpers are `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, and `src/lib/supabase/proxy.ts`.

## 9. Announcement behavior

Teachers create announcements through `/announcements`. The form supports:

- Title.
- Full text content.
- Optional event date/time.
- Priority selection.
- Optional poster upload.

Announcement feeds now show:

- Poster image.
- Priority badge.
- Event date and time.
- Full announcement text without three-line truncation.
- “More details” label.
- Author name lookup through `profiles.user_id`.
- Creation time.

## 10. Teacher dashboard behavior

The teacher dashboard queries alumni and request relationships, then ranks alumni using a local score:

- Associated student: `+10`
- Active connection: `+5`
- Completed connection: `+15`

The leaderboard displays:

- Alumni rank.
- Name and profile information.
- Associated student count.
- Active connection count.
- Completed connection count.
- Performance score.

## 10A. Notification foundation

Migration `13_notifications.sql` creates the user-scoped `notifications` table with Realtime publication and RLS. Database triggers create notifications for new mentorship requests, resume review requests, referral requests, and chat messages. The notification center UI is intentionally not implemented yet; that belongs to Phase 2.

Phase 2 now includes [`NotificationBell.tsx`](./src/components/dashboard/NotificationBell.tsx), mounted in the global TopBar. It loads the current user's latest notifications, subscribes to Realtime inserts, displays the unread count, supports mark-all-as-read, and marks linked notifications as read when opened.

## 10B. Admin verification portal

Phase 3 adds a server-protected `/dashboard/admin` route. Administrators can review unverified alumni, approve an alumni profile through a server action, and send an `alumni_verified` notification. The portal also reports active students, verified alumni, and completed mentorship sessions. Migration `14_admin_verification.sql` adds the admin role helper and RLS access for alumni verification, session metrics, and approval notifications.

## 10C. Mentorship capacity and production polish

Phase 4 adds `15_mentorship_capacity.sql`, which gives each alumni a configurable `monthly_session_limit` (default 10) and rejects new pending/accepted mentorship sessions after the monthly limit is reached. It also adds `16_announcement_poster_cleanup.sql`, which removes replaced or deleted announcement poster objects from Supabase Storage. Request modals now surface primary insert/upload errors instead of showing false success states or using placeholder resume URLs.

Migration `17_onboarding_schema_compatibility.sql` backfills the canonical `profiles.user_id` key for older deployments and makes `student_profiles.graduation_year` nullable because onboarding does not require that field.

The dashboard also displays total registered students, total associated students, pending requests, and a highlighted top-performing alumni.

## 11. Authentication and routing

The authenticated dashboard layout:

1. Gets the current Supabase user.
2. Redirects unauthenticated users to `/login`.
3. Looks up the profile using `user_id`.
4. Requires the standardized `profiles.user_id` profile row.
5. Redirects users without a profile to `/onboarding`.
6. Chooses role-specific navigation.

`proxy.ts` and `src/lib/supabase/proxy.ts` refresh Supabase auth cookies for the Next.js 16 setup.

## 12. Validation performed

The browser smoke pass verified public route rendering, authentication form validation, teacher onboarding, the teacher announcements page, profile settings, requests, the teacher performance dashboard, student flows for the dashboard, directory, sessions, announcements, requests, notifications, profile, and messages, and the authenticated alumni dashboard shell. Legacy deployments without `profiles.user_id` are handled by compatibility fallbacks, while migration `17_onboarding_schema_compatibility.sql` remains required to standardize the live schema. Student referral creation is compatible with the deployed referral enum by storing the complete referral request in `requests`.

TypeScript and production build checks pass:

- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

The full ESLint check still reports legacy issues in older screens, primarily explicit `any` usages and React effect-state warnings:

- Existing unused imports/state in announcement code.
- Existing Next.js warnings for raw `<img>` usage.

The current TypeScript and production build checks pass. The full ESLint check still reports legacy issues in older screens, primarily explicit `any` usages and React effect-state warnings.

## 13. Known risks and follow-up work

### High priority

1. Apply migrations `10` through `19` to the actual Supabase project. Local SQL files do not change the live database automatically. Migration `18_fix_conversation_rls.sql` is required before existing conversation participant policies stop producing recursive RLS errors, and migration `19_request_status_compatibility.sql` is required for alumni request actions on deployments missing `requests.status`.
2. Confirm the live database has `requests.student_id`, `requests.alumni_id`, and ideally `requests.status`.
3. Confirm teacher request SELECT RLS is active.
4. Confirm the `announcement-posters` Storage bucket and policies exist.
5. Regenerate Supabase TypeScript types from the live schema.

### Medium priority

1. Keep all Supabase helpers under the canonical `src/lib/supabase` directory.
2. Consolidate duplicate type definitions in `src/types/index.ts` and `src/types/database.ts`.
3. Remove or fully retire obsolete teacher messaging migrations and legacy participant-table code after confirming no production data depends on them.
4. Replace raw `<img>` tags with Next.js image handling where appropriate.
5. Replace the default Next.js README with ALNOVA-specific setup documentation.

### Product decisions still needed

1. Define whether “associated student” means accepted requests only, all non-declined requests, or any request record.
2. Define a formal performance formula or allow teachers to configure weights.
3. Decide whether teachers should see individual student names under each alumni.
4. Decide whether announcement posters should be replaceable/deletable from Storage when an announcement is edited or deleted.

## 14. How to run

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run lint:

```bash
npm run lint
```

Run type checking:

```bash
npx tsc --noEmit
```

## 15. Important handoff instruction for another AI

Before changing database-dependent code, inspect the live Supabase schema and compare it with `supabase/reset_schema.sql` and the latest migrations. Do not assume migrations have been applied. The active application contract is `profiles.user_id`; migrate any remaining legacy data before deployment. Do not reintroduce teacher messaging unless the product requirement changes; the current teacher experience is intentionally dashboard plus announcements.
