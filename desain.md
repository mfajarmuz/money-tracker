# Money Tracker — Dokumen Desain

## 1. Ringkasan Proyek

**Money Tracker** adalah aplikasi web pencatat keuangan pribadi berbasis browser. Dibangun dengan pendekatan mobile-first menggunakan Vanilla HTML/CSS/JS dan Supabase sebagai backend database.

- **Target pengguna:** Pribadi (single-user)
- **Platform:** Web browser (mobile-first, responsive)
- **Hosting:** GitHub Pages (static hosting)
- **Mata uang:** Rupiah (IDR)
- **Bahasa antarmuka:** Bahasa Indonesia

---

## 2. Tech Stack

| Layer       | Teknologi                          |
|-------------|------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript    |
| Backend/DB  | Supabase (PostgreSQL + REST API)   |
| Chart       | Chart.js (CDN)                     |
| Icons       | Font Awesome 6 (CDN)               |
| Hosting     | GitHub Pages                       |
| Repo        | github.com/mfajarmuz/money-tracker |

> Tidak ada build step, bundler, atau framework. File statis langsung di-serve.

---

## 3. Arsitektur

```
┌─────────────────────────────────┐
│         GitHub Pages            │
│   index.html + app.js + css     │
└──────────┬──────────────────────┘
           │ HTTPS (REST API)
           ▼
┌─────────────────────────────────┐
│         Supabase                │
│  ┌─────────────┐ ┌───────────┐ │
│  │ transactions │ │ categories│ │
│  └─────────────┘ └───────────┘ │
│  ┌─────────────┐               │
│  │   profiles   │  (Supabase   │
│  └─────────────┘    Auth)      │
└─────────────────────────────────┘
```

---

## 4. Autentikasi

- **Metode:** Supabase Auth (email + password)
- **Perilaku sesi:** Persistent session — user tetap login sampai logout manual. Tidak ada auto-logout / session timeout.
- **Flow:**
  1. Halaman login muncul jika belum ada session aktif
  2. User masukkan email + password
  3. Session disimpan di `localStorage` oleh Supabase SDK
  4. Tombol logout tersedia di halaman Pengaturan
- **RLS (Row Level Security):** Aktif — setiap user hanya bisa melihat/mengedit data miliknya sendiri

---

## 5. Database Schema

### Tabel `transactions`

| Kolom        | Tipe        | Keterangan                        |
|--------------|-------------|-----------------------------------|
| `id`         | uuid (PK)   | Auto-generated                    |
| `user_id`    | uuid (FK)   | Referensi ke auth.users           |
| `deskripsi`  | text        | Keterangan transaksi              |
| `nominal`    | bigint      | Jumlah dalam Rupiah               |
| `tipe`       | text        | `pemasukan` atau `pengeluaran`    |
| `kategori`   | text        | Nama kategori                     |
| `created_at` | timestamptz | Waktu pencatatan (default: now()) |

### Tabel `categories`

| Kolom        | Tipe        | Keterangan              |
|--------------|-------------|--------------------------|
| `id`         | uuid (PK)   | Auto-generated          |
| `user_id`    | uuid (FK)   | Referensi ke auth.users |
| `nama`       | text        | Nama kategori           |
| `created_at` | timestamptz | Waktu dibuat            |

### RLS Policy

```sql
-- transactions: user hanya akses data sendiri
CREATE POLICY "Users manage own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);

-- categories: user hanya akses data sendiri
CREATE POLICY "Users manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id);
```

---

## 6. Fitur

### 6.1 Dashboard (Home)
- Saldo total (pemasukan − pengeluaran)
- Ringkasan pemasukan & pengeluaran
- Quick actions: Pemasukan, Pengeluaran, Report, More
- Riwayat transaksi terbaru (5 terakhir) + link "Lihat Semua"

### 6.2 Tambah Transaksi
- Modal full-screen numpad UI
- Pilih tipe: Pemasukan / Pengeluaran
- Pilih kategori via chip selector
- Input keterangan (opsional)
- Tombol simpan (disabled jika nominal = 0)

### 6.3 Riwayat Lengkap
- Daftar semua transaksi
- Filter: waktu (hari ini / bulan ini / tahun ini / semua)
- Filter: kategori
- Pencarian teks di keterangan
- Hapus transaksi individual

### 6.4 Laporan (Report)
- Summary card: pemasukan, pengeluaran, net income
- Filter waktu: semua / bulan ini / hari ini
- Doughnut chart pengeluaran per kategori
- Top 3 pengeluaran terbesar

### 6.5 Kategori (Category)
- Tambah kategori baru
- Daftar kategori yang ada
- Hapus kategori (dilindungi jika sedang dipakai transaksi)

### 6.6 Pengaturan (Settings)
- Ekspor data ke CSV
- Reset database (hapus semua transaksi, double confirm)
- Tombol logout

---

## 7. Desain UI

### 7.1 Tema & Warna

| Token                | Nilai     | Fungsi               |
|----------------------|-----------|----------------------|
| `--clr-dark-green`   | `#0F172A` | Header background    |
| `--clr-light-green`  | `#3B82F6` | Aksen utama (biru)   |
| `--clr-neon-green`   | `#60A5FA` | Aksen sekunder       |
| `--clr-bg`           | `#F5F7FA` | Background halaman   |
| `--clr-white`        | `#FFFFFF` | Card background      |
| `--clr-expense`      | `#EF4444` | Warna pengeluaran    |
| `--clr-income`       | `#10B981` | Warna pemasukan      |
| `--clr-text-main`    | `#1A1A1A` | Teks utama           |
| `--clr-text-muted`   | `#6B7280` | Teks sekunder        |

### 7.2 Layout
- **Mobile-first**, max-width 480px centered
- Bottom navigation bar (5 item + FAB tengah)
- Rounded corners (16px–32px) di semua card & section
- Transisi halus (fade-in antar view)

### 7.3 Navigasi

```
[ Home ]  [ Report ]  [ + FAB ]  [ Category ]  [ Settings ]
```

- FAB (Floating Action Button) di tengah bottom nav untuk tambah transaksi
- View switching tanpa reload (SPA single-page)

### 7.4 Tipografi
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Balance amount: 36px bold
- Section header: 18px semibold
- Body text: 14px
- Caption/muted: 11–12px

---

## 8. Halaman & Navigasi

```
Login ──→ Dashboard (Home)
              │
              ├── Tambah Transaksi (Modal)
              ├── Riwayat Lengkap
              ├── Laporan (Report)
              ├── Kategori (Category)
              └── Pengaturan (Settings)
                      └── Logout ──→ Login
```

---

## 9. Deployment

### GitHub Pages
1. Push ke branch `master`
2. Settings → Pages → Source: `master` / `root`
3. URL: `https://mfajarmuz.github.io/money-tracker/`

### Environment Variable
Supabase URL dan API key di-embed langsung di `app.js` (acceptable karena anon key + RLS melindungi data per-user).

---

## 10. Batasan & Keputusan Desain

| Keputusan                     | Alasan                                                |
|-------------------------------|-------------------------------------------------------|
| Vanilla JS, tanpa framework   | Simpel, tanpa build step, langsung serve statis       |
| Supabase anon key di frontend | Aman karena RLS aktif, data terisolasi per user       |
| Tidak ada offline/PWA         | Kebutuhan saat ini web-only, koneksi internet wajib   |
| Single currency (IDR)         | Target pengguna pribadi di Indonesia                  |
| Chart.js via CDN              | Ringan, tidak perlu install/bundle                    |
| Tidak ada dark mode           | Blue/White clean theme sudah cukup untuk saat ini     |

---

## 11. Roadmap (Opsional / Masa Depan)

> Fitur-fitur berikut **belum** direncanakan aktif, tapi bisa ditambahkan nanti:

- [ ] Budget/target bulanan per kategori
- [ ] Recurring transaction (gaji, tagihan rutin)
- [ ] Multi-wallet (dompet, bank, e-wallet)
- [ ] PWA + offline support
- [ ] Dark mode toggle
- [ ] Notifikasi/reminder tagihan
- [ ] Foto struk/nota attachment
- [ ] Multi-currency
