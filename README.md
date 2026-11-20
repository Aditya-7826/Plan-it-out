# Plan it out

A personal day planner with a frosted "liquid glass" look. You can plan daily to-dos, keep a list of side quests, set high or low priority, review what you did and didn't do, and track your progress on a contribution graph with personal bests. Everything is on one page.

### 🔗 Use it now: **[aditya-7826.github.io/Plan-it-out](https://aditya-7826.github.io/Plan-it-out/)**

No sign-up needed. Your data is saved privately in your own browser. Sign in with your email if you want your laptop and phone to share one planner.

## Features

- **Daily to-do list.** Add tasks for any day, with optional planned minutes and a priority. Tick them off, skip them, duplicate them or delete them.
- **Priorities.** Every task and side quest is either **High** or **Low** priority. High-priority items are listed first, with a divider before the low-priority ones. Click a priority chip to switch it.
- **Side quests.** Keep a list of hobbies, little projects and things you want to try, each with its own priority. Press **+** on a side quest to add it to the selected day's plan. Tick a side quest's box to mark it done for that day, just like a to-do. It then counts toward the day's progress, the review, the activity graph and your personal bests.
- **Day review.** See what you finished and what you didn't for any day. On past days, unfinished tasks are marked as missed, and one click moves them to today.
- **Notes.** Write notes for each day.
- **Activity graph.** A GitHub-style grid of the last year. The brighter a square, the more tasks you finished that day. Click a square to open that day.
- **Personal bests.** Current and longest streak, most tasks in a day, best week, total tasks done, total time, and completion rate. A popup appears when you beat a record.
- **Week at a glance.** A strip under the header shows Monday to Sunday with each day's progress. Click a day to open it.
- **Sync across devices.** Sign in with the same email on your laptop and phone and both show the same planner. Changes upload a moment after you make them, and the app keeps working offline and catches up later. If both devices changed while apart, the changes are merged so nothing is lost.
- **Backup.** Export everything to a `.json` file, and import it on another device such as your phone. Imports are checked before anything is replaced.
- **Install on your phone.** Open the site and choose *Add to Home Screen*. It opens like an app and keeps working offline.
- **Day navigation.** Use the ‹ › arrows, the date picker or the week strip to move between days, and **Today** to jump back.

A **streak** counts consecutive days where you planned at least one task and finished every task you didn't skip.

## Where is my data stored?

Everything is always saved first in your browser's `localStorage`, so the app works offline.

- **Not signed in:** nothing is uploaded. The only network request is a quick check of the current Indian time. Clearing site data or switching browsers starts you fresh, so use **Export backup** to keep a copy.
- **Signed in:** your planner is also stored in your own Supabase database, as one row that only your account can read or change. This is enforced by the database's row-level security rules in `supabase/schema.sql`. Your sign-in session is kept in this browser until you sign out.

## Files

| File                    | Purpose                                                              |
|-------------------------|----------------------------------------------------------------------|
| `index.html`            | Page structure                                                       |
| `style.css`             | Liquid glass theme and layout                                        |
| `app.js`                | Tasks, side quests, priorities, review, graph, personal bests, storage   |
| `assets/background.jpg` | Background photo (mountains and black-sand beach)                    |
| `assets/fonts/`         | Inter font files, hosted with the site                               |
| `assets/icon-*.png`, `assets/apple-touch-icon.png` | App icons for phones and browsers     |
| `manifest.webmanifest`  | Lets the planner be installed as an app                              |
| `sw.js`                 | Service worker: offline support                                      |
| `vercel.json`           | Security headers for hosting on Vercel                               |
| `config.js`             | Your Supabase project address and public key (empty = no sync)       |
| `sync.js`               | Sign-in and syncing with Supabase                                    |
| `supabase/schema.sql`   | Database table and security rules to paste into Supabase             |
| `.gitignore`            | Keeps `.env` files, the `.vercel` folder and similar out of git      |

## Setting up sync (one time, free)

Sync uses [Supabase](https://supabase.com)'s free plan. Until you do these steps, the app works on each device separately.

1. **Create a project.** Sign up at supabase.com, then click **New project**. Pick any name, a strong database password (save it somewhere) and the region closest to you, e.g. Mumbai.
2. **Create the table.** Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. It should say *Success. No rows returned*.
3. **Set the sign-in addresses.** Open **Authentication → URL Configuration**:
   - **Site URL:** your live address, e.g. `https://your-app.vercel.app`
   - **Redirect URLs:** add your live address, plus `http://localhost:8765` if you also run it locally
4. **Show the code in the sign-in email.** Open **Authentication → Emails → Templates**. In both the **Magic Link** and **Confirm signup** templates, add this line:
   ```html
   <p>Or type this code in Plan it out: <strong>{{ .Token }}</strong></p>
   ```
   On a phone, the installed app and the browser keep separate storage, so typing the code *inside the installed app* is the reliable way to sign in there.
5. **Copy your keys into `config.js`.** In **Project Settings → API Keys** (and **Data API** for the URL), copy:
   - the **Project URL** into `supabaseUrl`
   - the **publishable / anon public** key into `supabaseAnonKey`

   Both are meant to be public, so it's fine to commit them. **Never** use the `service_role` / secret key, which bypasses all the security rules.
6. **Deploy, then sign in on each device:** first your laptop, then your phone, with the same email.

**Optional hardening:**
- In `vercel.json`, replace `https://*.supabase.co` in `connect-src` with your exact project URL.
- In **Authentication → Rate Limits**, keep the email limits low.

Supabase's built-in email sender only allows a few sign-in emails per hour. That's fine for one person, since you only sign in once per device.

## Running locally

No build step is needed. Clone the repo:

```bash
git clone https://github.com/Aditya-7826/Plan-it-out.git
cd Plan-it-out
```

Then either double-click `index.html`, or serve it on localhost:

```bash
python -m http.server 8000
```

and open **http://localhost:8000** in your browser.

> Note: the localhost link only works on the computer running the command. To share the planner, use the [live link](https://aditya-7826.github.io/Plan-it-out/) above.

## Changelog

### v2.6: Tick off side quests (November 2026)

- Side quests now have a tick box, like the to-do list. Ticking one marks it done for the selected day, crosses it out, and adds it to the day's progress, Done list, activity graph and personal bests.
- Unticking removes it from that day again. If you had planned it with **+**, it goes back to "to do" instead.
- Ticking the same item in the to-do list also ticks the side quest, and the other way round. Ticks sync between devices like everything else.

### v2.5: Sync between laptop and phone (November 2026)

- **Accounts and sync with Supabase.** Sign in with your email, using the link or a 6-digit code, with no password. All your devices share one planner.
- **Offline first.** Changes are always saved on the device first, then uploaded about 1.5 s later. The app also syncs when you come back to it and every minute while it's open. A status button in the header shows *Synced*, *Syncing…*, *Not synced yet*, *Offline* or *Sync problem*.
- **No lost changes.** Every save carries a version number. If two devices save at the same time, the second one notices, pulls the other's changes, merges them and saves again. Merging keeps tasks and side quests from both sides and joins notes that differ. Something deleted on one device while the other was editing offline may come back.
- **Security:**
  - Each account can only read and write its own row (Postgres row-level security).
  - Signed-out visitors have no database access.
  - The data must be a JSON object under 1 MB.
  - Downloaded data is checked with the same rules as backup imports before it's used.
  - Sign-in tokens are removed from the address bar immediately.
  - No library is added: it uses plain `fetch` under the existing strict Content-Security-Policy, which now also allows `*.supabase.co`.
- New files: `config.js`, `sync.js`, `supabase/schema.sql`. The service worker cache was bumped to `v2` to include them.
- Fixed: buttons and forms with the `hidden` attribute could still show. For example, "Move 0 unfinished tasks to today" appeared on today's card.
- The email box stretches like the other inputs, and the Backup text no longer says plans live only in this browser.

### v2.4: Secure deployment, backups and phone app (November 2026)

- **Security headers** for Vercel in `vercel.json`:
  - a strict Content-Security-Policy that only allows the site's own files plus the two time services
  - HSTS
  - `nosniff`
  - no framing
  - no referrer
  - a Permissions-Policy that turns off camera, microphone, location and payment
  - cross-origin isolation headers
  - `noindex` so search engines don't list the site
- **Fonts are now hosted with the site** instead of being loaded from Google Fonts, so the page makes no calls to Google.
- Removed the one inline style the CSP would have blocked (in the week strip), without changing how it looks.
- **Backup:** a new section to export your data as `plan-it-out-YYYY-MM-DD.json` and import it elsewhere. Imports are limited to 1 MB, must match the planner's data format, and ask for confirmation before replacing anything.
- **Installable app (PWA):** added an app manifest, icons and a service worker. The planner can be added to a phone's home screen and opens offline. The time check is never cached.
- Added `.gitignore`. The full git history was scanned for leaked keys and passwords and none were found. GitHub secret scanning and push protection are switched on for the repo.

### v2.3: Two priorities and side quests (November 2026)

- Priorities are now just **High** and **Low** (Medium is gone). New tasks and side quests start as Low. Anything saved as Medium is changed to Low automatically.
- Renamed the **Hobbies** section to **Side quests**, with a compass icon. Side quests you already added are kept.

### v2.2: Indian time (November 2026)

- "Today" is now always worked out in **Indian Standard Time (Asia/Kolkata)**, whatever timezone or clock setting the browser has.
- When the page opens, it checks the real time online: the website server's clock, or a public time service if that isn't available. If the device clock is more than 2 minutes off, the app corrects it. Only the time is requested. None of your data is sent.
- If the page is left open past midnight IST, it moves to the new day automatically.

### v2.1: Planner look (November 2026)

- Cleaned the background photo. The glass menu (Edit, Duplicate, Favourite, Share, Delete) and the "Liquid Glass" title that were part of the image are completely removed. Only the real mountain and beach scenery remains, joined with a soft blend. The file is now `assets/background.jpg` and is much smaller (about 350 KB instead of 2.6 MB).
- The **Plan it out** title now uses Inter, the same font as the rest of the page, instead of the separate Chewy display font.
- Redesigned the header like a planner page: a small "Plan it out" label, the selected date written out in large text (e.g. "Friday, 20 November"), and a one-line summary of tasks left, done or missed.
- Added a **week strip** under the header. It shows Monday to Sunday of the selected week, with a progress bar under each day. Click a day to open it.
- Section headings are now small uppercase labels with a divider line, like planner sections.
- The notes box now has ruled lines, like a notebook page.

### v2: Plan it out (November 2026)

- Renamed the project from **Night Sky Study Planner** to **Plan it out**, and renamed the GitHub repo from `Study-planner` to `Plan-it-out`. The live link moved to `aditya-7826.github.io/Plan-it-out/`.
- Replaced the night-sky theme and twinkling-star animation with a **liquid glass** design: a full-screen photo background, frosted translucent cards with bright edges, white line icons, menu-style lists with divider lines, and a large rounded title (Chewy and Inter fonts from Google Fonts).
- Widened the layout to a two-column grid on desktop. It becomes one column on phones.
- "Study goals" became general **tasks**. Each has a priority (High, Medium or Low) and a status (to do, done or skipped).
- Added **skip** and **duplicate** actions to tasks.
- Added a **Hobbies** list with priorities and one-click "add to today's plan".
- Added a **Day review** panel listing done and not-done tasks, with past unfinished tasks marked as *missed*.
- Added **Move unfinished to today** for past days.
- Replaced the "Last 7 days" row with a full-year **activity graph**.
- Added **Personal bests**: current and longest streak, most tasks in a day, best week, total done, total time, and completion rate, with a popup when a record is broken.
- Streaks now ignore skipped tasks.
- Moved storage to a new key (`planItOut.v2`). Goals and notes from the old version are copied over automatically on first load.

### v1: Night Sky Study Planner

- Daily study goals with planned minutes, a progress bar, daily notes, a 7-day history and a streak counter, on a night-sky theme.
