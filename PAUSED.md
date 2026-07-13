# HANA (Hasab wa Nasab)

> **STATUS: ⏸ PAUSED** — sejak 2026-07-13

## Apa ini
Family tree web app (PWA) — bikin, lihat, dan kelola silsilah keluarga
dengan diagram canvas interaktif (zoom, auto-layout), detail person,
dan upload foto profil.

## Kondisi terakhir
- Sampai mana: fitur inti sudah jalan & deployed — CRUD person +
  relationship, multi-family (halaman `/family/[id]` + FamilyList),
  canvas React Flow dengan auto-fit & zoom, login, smart Add flow,
  mobile-friendly, PWA, favicon. Commit terakhir: `d99094c favicon`
  (2026-07-14), working tree clean.
- Stack/file penting:
  - Next.js 16 + React 18 + Tailwind, React Flow (`@xyflow/react`),
    layout via dagre/elkjs/d3-hierarchy (`src/lib/familyLayout.ts`)
  - Backend: Supabase (Postgres + Storage untuk foto). API routes
    di `src/app/api/{families,persons,relationships,upload}` pakai
    Supabase client (Prisma masih ada untuk schema/db push saja)
  - Komponen utama: `src/components/FamilyTreeCanvas.tsx`,
    `PersonForm.tsx`, `PersonDetails.tsx`, `FamilyList.tsx`
  - PRD lengkap: `CONTEXT.md` (data model persons + relationships)
- Keputusan yang sudah dibuat:
  - Prisma diganti Supabase client di semua API routes (Prisma
    bermasalah di serverless) — jangan balik ke Prisma runtime
  - `updated_at` & `id` default (`gen_random_uuid()`) di-set manual /
    di DB karena NOT NULL violation
  - Service worker PWA exclude `/api/*` dari cache
  - Dev server jalan di port 3005 (`npm run dev`)

## Kenapa dipause
Fitur inti untuk kebutuhan keluarga sudah cukup; prioritas pindah ke
project lain.

## What next (kalau dilanjut)
- [ ] `npm run dev` lalu klik-klik semua flow (add/edit/delete person,
      relationship, upload foto) untuk refresh ingatan
- [ ] Tangani edge cases dari PRD yang belum: duplicate person &
      missing photo fallback
- [ ] Bereskan sisa Prisma: schema masih dipakai `db:push` tapi client
      sudah tidak dipakai — putuskan mau full Supabase migrations atau
      tetap hybrid
- [ ] Rapikan auth/login (cek apakah masih hardcoded/dev config dari
      commit `3a4752c`)

## Syarat dilanjut
Ada kebutuhan nyata dari keluarga (misal: mau input data keluarga besar
bareng-bareng) atau project prioritas sekarang sudah stabil.
