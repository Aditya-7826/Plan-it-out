# Plan it out

A personal day planner with a frosted "liquid glass" look. You can plan daily to-dos, keep a list of side quests, set high or low priority, review what you did and didn't do, and track your progress on a contribution graph with personal bests. Everything is on one page.

### 🔗 Use it now: **[aditya-7826.github.io/Plan-it-out](https://aditya-7826.github.io/Plan-it-out/)**

No sign-up needed. Your data is saved privately in your own browser.

## Features

- **Daily to-do list.** Add tasks for any day, with optional planned minutes and a priority. Tick them off, skip them, duplicate them or delete them.
- **Priorities.** Every task and side quest is either **High** or **Low** priority. High-priority items are listed first, with a divider before the low-priority ones. Click a priority chip to switch it.
- **Side quests.** Keep a list of hobbies, little projects and things you want to try, each with its own priority. Press **+** on a side quest to add it to the selected day's plan.
- **Day review.** See what you finished and what you didn't for any day. On past days, unfinished tasks are marked as missed, and one click moves them to today.
- **Notes.** Write notes for each day.
- **Activity graph.** A GitHub-style grid of the last year. The brighter a square, the more tasks you finished that day. Click a square to open that day.
- **Personal bests.** Current and longest streak, most tasks in a day, best week, total tasks done, total time, and completion rate. A popup appears when you beat a record.
- **Week at a glance.** A strip under the header shows Monday to Sunday with each day's progress. Click a day to open it.
- **Day navigation.** Use the ‹ › arrows, the date picker or the week strip to move between days, and **Today** to jump back.

A **streak** counts consecutive days where you planned at least one task and finished every task you didn't skip.

## Where is my data stored?

Everything is saved automatically in your browser's `localStorage`. Nothing is uploaded anywhere. The only network request the app makes is a quick check of the current Indian time. This means:

- Your data stays private on your device.
- It's tied to that browser, so clearing site data or switching browsers or devices starts you fresh.

## Files

| File                    | Purpose                                                              |
|-------------------------|----------------------------------------------------------------------|
| `index.html`            | Page structure                                                       |
| `style.css`             | Liquid glass theme and layout                                        |
| `app.js`                | Tasks, side quests, priorities, review, graph, personal bests, storage   |
| `assets/background.jpg` | Background photo (mountains and black-sand beach)                    |

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
