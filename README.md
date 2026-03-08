# 📚 Elimu Learn

**Offline-First Science Learning PWA for Ugandan Secondary School Students**

Subjects: Mathematics • Physics • Biology • Chemistry | Classes: S1–S6

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (optional — app works offline without Supabase)
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Run development server
npm run dev

# 4. Build for production
npm run build

# 5. Preview production build
npm run preview
```

---

## 📦 Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — done! App is live and installable as a PWA.

---

## 🗄️ Supabase Setup (Optional — for cloud sync)

Run this SQL in your Supabase SQL editor:

```sql
-- Students table
create table students (
  id bigint primary key generated always as identity,
  local_id integer,
  name text not null,
  class_level text,
  total_xp integer default 0,
  streak_days integer default 1,
  school_id text,
  updated_at timestamptz default now()
);

-- Progress table
create table progress (
  id bigint primary key generated always as identity,
  local_id integer,
  student_local_id integer,
  subject text,
  topic_id text,
  lesson_id text,
  status text default 'not_started',
  score integer default 0,
  best_score integer default 0,
  attempts integer default 0,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

-- Quiz attempts table
create table quiz_attempts (
  id bigint primary key generated always as identity,
  student_local_id integer,
  lesson_id text,
  score integer,
  time_taken integer,
  attempted_at timestamptz default now()
);
```

---

## 📁 Project Structure

```
elimu-learn/
├── public/
│   └── icons/          # PWA icons
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # React context (UserContext)
│   ├── curriculum/     # JSON lesson content
│   │   ├── mathematics/
│   │   ├── physics/
│   │   ├── biology/
│   │   └── chemistry/
│   ├── db/             # IndexedDB (Dexie.js) logic
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # App screens
│   ├── supabase/       # Supabase client
│   └── utils/          # Helper functions
├── vite.config.js      # Vite + PWA configuration
└── package.json
```

---

## ➕ Adding More Curriculum Content

To add new lessons, create a JSON file in the correct folder:

```
src/curriculum/{subject}/{class_level}/{topic_name}.json
```

Then register it in `src/pages/TopicList.jsx` under `SUBJECT_FILES`.

Each JSON file must follow the structure in `ELIMU-LEARN-MasterPlan.docx` Section 5.

---

## 🛠️ Tech Stack

- **React + Vite** — fast, component-based UI
- **Tailwind CSS** — utility-first styling
- **Dexie.js** — IndexedDB wrapper for offline storage
- **vite-plugin-pwa + Workbox** — PWA/service worker
- **Supabase** — optional cloud sync
- **Recharts** — progress charts
- **React Router** — navigation

---

Built with ❤️ for students across Uganda and East Africa.
