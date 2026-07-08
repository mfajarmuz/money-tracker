-- 1. Buat Tabel Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deskripsi TEXT NOT NULL,
    nominal BIGINT NOT NULL,
    tipe TEXT NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
    kategori TEXT DEFAULT 'Lainnya',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. (Opsional tapi direkomendasikan) Row Level Security (RLS)
-- Mengizinkan baca/tulis anonim untuk development. Nanti bisa diubah kalau butuh auth user.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" 
ON public.transactions FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for all users" 
ON public.transactions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" 
ON public.transactions FOR DELETE 
USING (true);

-- 3. (Opsional) Buat Tabel Kategori untuk manajemen dinamis di server
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Enable insert access for categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for categories" ON public.categories FOR DELETE USING (true);

-- Insert default kategori
INSERT INTO public.categories (nama) VALUES 
('Gaji'), ('Makan'), ('Transport'), ('Lainnya') 
ON CONFLICT DO NOTHING;
