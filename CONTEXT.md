# Wardrobe App — Project Context

## Goal
Smart wardrobe planner app untuk personal use.

## Tech Stack
- Next.js + TypeScript
- Supabase (auth, database, storage)
- Tailwind CSS + Shadcn UI
- Remove.bg API (AI remove background)
- OpenWeather API (Phase 2)
- Design style: Threads-inspired dark UI

## Phase 1 (Current)
- Google OAuth via Supabase
- Upload pakaian + AI remove background
- Catalog view (grid)
- Filter by kategori & warna
- Detail item pakaian
- Hapus item

## Phase 2
- Weekly planning (7 hari)
- Weather forecast integration
- Cost per wear
- Laundry state management
- Item state: Clean → Worn → Laundry → Clean

---

## Database

Run this SQL in Supabase SQL Editor:

```sql
-- Table
CREATE TABLE wardrobe_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL,
  image_url TEXT NOT NULL,
  original_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own items"
  ON wardrobe_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('wardrobe', 'wardrobe', true);

-- Storage policies
CREATE POLICY "Users upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read wardrobe"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wardrobe');

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
```