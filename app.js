// ===========================
// Money Tracker — app.js
// Auth + CRUD + Charts
// ===========================

// Supabase Init
const SUPABASE_URL = 'https://rcclzilnplzpixsbtabx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjY2x6aWxucGx6cGl4c2J0YWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NjIwMzgsImV4cCI6MjA5OTAzODAzOH0.1rxDRNsfGt8juoi0civPOllRLDRWFN74-lTJf5J9BRM';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===========================
// AUTH
// ===========================
document.addEventListener('DOMContentLoaded', () => {

function showAuthScreen() {
    document.getElementById('authScreen').style.display = '';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
}

function showApp(user) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = '';
    document.getElementById('bottomNav').style.display = '';
    const emailEl = document.getElementById('currentUserEmail');
    if (emailEl) emailEl.textContent = 'Login sebagai: ' + (user.user_metadata?.username || user.email?.replace('@mt.user.com', '') || '');
    initApp();
}

// Auth tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById('loginForm').style.display = target === 'login' ? '' : 'none';
        document.getElementById('registerForm').style.display = target === 'register' ? '' : 'none';
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
    });
});

// Helper: username → fake email for Supabase Auth
function toEmail(username) { return username.toLowerCase().trim() + '@mt.user.com'; }
function toUsername(email) { return (email || '').replace('@mt.user.com', ''); }

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(username), password });
    btn.disabled = false;
    btn.textContent = 'Masuk';

    if (error) {
        errEl.textContent = error.message === 'Invalid login credentials'
            ? 'Username atau password salah'
            : error.message;
        return;
    }
    showApp(data.user);
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPw = document.getElementById('regPasswordConfirm').value;
    const errEl = document.getElementById('registerError');
    const btn = document.getElementById('regBtn');
    errEl.textContent = '';

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errEl.textContent = 'Username hanya boleh huruf, angka, dan underscore';
        return;
    }

    if (password !== confirmPw) {
        errEl.textContent = 'Password tidak sama';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Memproses...';

    const { data, error } = await sb.auth.signUp({
        email: toEmail(username),
        password,
        options: { data: { username } }
    });
    btn.disabled = false;
    btn.textContent = 'Daftar';

    if (error) {
        if (error.message.includes('already registered')) {
            errEl.textContent = 'Username sudah dipakai';
        } else {
            errEl.textContent = error.message;
        }
        return;
    }

    if (data.user && data.session) {
        showApp(data.user);
    } else {
        showApp(data.user);
    }
});

// Check existing session on load
(async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        showApp(session.user);
    } else {
        showAuthScreen();
    }

    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') showAuthScreen();
    });
})();

}); // end DOMContentLoaded

// Logout (global, called from HTML onclick)
window.logoutUser = async function() {
    await sb.auth.signOut();
    document.getElementById('authScreen').style.display = '';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
};

// ===========================
// MAIN APP (only runs after auth)
// ===========================
let appInitialized = false;

async function initApp() {
    if (appInitialized) {
        await fetchAndRender();
        return;
    }
    appInitialized = true;

    window.fetchAndRenderGlobal = fetchAndRender;

    // Navigation (SPA Logic)
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            views.forEach(v => v.classList.remove('active'));
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
        });
    });

    // Elements
    const tableBody = document.getElementById('historyTableBody');
    const totalSaldoEl = document.getElementById('totalSaldo');
    const sumPemasukanEl = document.getElementById('summaryPemasukan');
    const sumPengeluaranEl = document.getElementById('summaryPengeluaran');
    const sumTransaksiEl = document.getElementById('summaryTransaksi');
    const chartCanvas = document.getElementById('financeChart');
    const categoryForm = document.getElementById('categoryForm');
    const categoryTableBody = document.getElementById('categoryTableBody');

    // State
    let transactions = [];
    let categories = [];
    let chartInstance = null;
    let currentFilter = 'all';
    window.transactions = [];

    const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    });

    // Setup Filter Listeners
    const filterBtns = document.querySelectorAll('.time-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            updateUI();
        });
    });

    function updateUI() {
        renderFilterCategories();
        renderCategories();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        let reportTransactions = transactions;
        if (currentFilter === 'month') {
            reportTransactions = transactions.filter(t => t.created_at >= startOfMonth);
        } else if (currentFilter === 'today') {
            reportTransactions = transactions.filter(t => t.created_at >= startOfDay);
        }

        if (tableBody) tableBody.innerHTML = '';

        let totalPemasukan = 0;
        let totalPengeluaran = 0;

        transactions.forEach(t => {
            const nominalAngka = Number(t.nominal) || 0;
            const tTipe = String(t.tipe).toLowerCase();

            if (tTipe === 'pemasukan') totalPemasukan += nominalAngka;
            else totalPengeluaran += nominalAngka;

            if (tableBody) {
                const tr = document.createElement('div');
                tr.setAttribute('data-tipe', t.tipe);
                tr.style.cssText = 'display:flex;align-items:center;padding:16px;background:#FFF;border-radius:16px;box-shadow:0 2px 5px rgba(0,0,0,0.05);margin-bottom:12px;position:relative;';

                const iconWrapper = document.createElement('div');
                iconWrapper.innerHTML = tTipe === 'pemasukan'
                    ? '<i class="fa-solid fa-arrow-down" style="color:#10B981"></i>'
                    : '<i class="fa-solid fa-arrow-up" style="color:#EF4444"></i>';
                iconWrapper.style.cssText = 'width:40px;height:40px;border-radius:50%;background:' + (tTipe === 'pemasukan' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') + ';display:flex;align-items:center;justify-content:center;margin-right:12px;';

                const txDate = new Date(t.created_at);
                const formattedDate = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                const formattedTime = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                const textWrapper = document.createElement('div');
                textWrapper.style.flex = '1';
                const tdDesc = document.createElement('div');
                tdDesc.textContent = t.deskripsi;
                tdDesc.style.cssText = 'font-weight:600;font-size:14px;color:#1A1A1A;';
                const tdCat = document.createElement('div');
                tdCat.textContent = (t.kategori || 'Lainnya') + ' \u2022 ' + formattedDate + ' ' + formattedTime;
                tdCat.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px;';
                textWrapper.append(tdDesc, tdCat);

                const tdNom = document.createElement('div');
                tdNom.textContent = formatter.format(t.nominal);
                tdNom.style.cssText = 'font-weight:700;font-size:15px;color:' + (tTipe === 'pemasukan' ? '#10B981' : '#EF4444') + ';margin-right:12px;';

                // Make row clickable to edit
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', (e) => {
                    // Ignore clicks on delete button if any
                    if (e.target.closest('button')) return;
                    openEditTransactionModal(t);
                });

                tr.append(iconWrapper, textWrapper, tdNom);
                tableBody.appendChild(tr);
            }
        });

        const totalSaldo = totalPemasukan - totalPengeluaran;
        if (totalSaldoEl) totalSaldoEl.textContent = formatter.format(totalSaldo);

        let reportPemasukan = 0, reportPengeluaran = 0;
        let expenseByCategory = {}, expenseTransactions = [];

        reportTransactions.forEach(t => {
            const nominalAngka = Number(t.nominal) || 0;
            const tTipe = String(t.tipe).toLowerCase();
            const cat = t.kategori || 'Lainnya';
            if (tTipe === 'pemasukan') reportPemasukan += nominalAngka;
            else {
                reportPengeluaran += nominalAngka;
                expenseByCategory[cat] = (expenseByCategory[cat] || 0) + nominalAngka;
                expenseTransactions.push(t);
            }
        });

        const headIn = document.getElementById('headerPemasukan');
        const headOut = document.getElementById('headerPengeluaran');
        if (headIn) headIn.textContent = formatter.format(totalPemasukan);
        if (headOut) headOut.textContent = formatter.format(totalPengeluaran);
        if (sumPemasukanEl) sumPemasukanEl.textContent = formatter.format(reportPemasukan);
        if (sumPengeluaranEl) sumPengeluaranEl.textContent = formatter.format(reportPengeluaran);
        if (sumTransaksiEl) sumTransaksiEl.textContent = formatter.format(reportPemasukan - reportPengeluaran);

        updateChart(expenseByCategory);
        renderTopExpenses(expenseTransactions);

        if (typeof window.filterHistoryList === 'function') window.filterHistoryList();
    }

    function renderTopExpenses(expenseTxs) {
        const topList = document.getElementById('topExpensesList');
        if (!topList) return;
        topList.innerHTML = '';
        const sorted = [...expenseTxs].sort((a, b) => Number(b.nominal) - Number(a.nominal)).slice(0, 3);
        if (sorted.length === 0) {
            topList.innerHTML = '<p style="text-align:center;color:#6B7280;font-size:14px;padding:16px;">Tidak ada pengeluaran di periode ini.</p>';
            return;
        }
        sorted.forEach(t => {
            const tr = document.createElement('div');
            tr.style.cssText = 'display:flex;align-items:center;padding:12px 16px;background:#FFF;border-radius:12px;box-shadow:0 2px 5px rgba(0,0,0,0.03);margin-bottom:8px;';
            const icon = document.createElement('div');
            icon.innerHTML = '<i class="fa-solid fa-arrow-up" style="color:#EF4444"></i>';
            icon.style.cssText = 'width:36px;height:36px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin-right:12px;';
            const text = document.createElement('div');
            text.style.flex = '1';
            const d = document.createElement('div'); d.textContent = t.deskripsi; d.style.cssText = 'font-weight:600;font-size:13px;color:#1A1A1A;';
            const c = document.createElement('div'); c.textContent = t.kategori || 'Lainnya'; c.style.cssText = 'font-size:11px;color:#6B7280;';
            text.append(d, c);
            const n = document.createElement('div'); n.textContent = formatter.format(t.nominal); n.style.cssText = 'font-weight:700;font-size:14px;color:#EF4444;';
            tr.append(icon, text, n);
            topList.appendChild(tr);
        });
    }

    function updateChart(expenseByCategory) {
        if (!chartCanvas) return;
        if (chartInstance) chartInstance.destroy();
        const labels = Object.keys(expenseByCategory);
        const data = Object.values(expenseByCategory);
        if (labels.length === 0) return;
        const colors = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#d946ef','#f43f5e'];
        chartInstance = new Chart(chartCanvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, hoverOffset: 4 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, font: { family: "'Inter', sans-serif", size: 12 } } },
                    tooltip: { callbacks: { label: ctx => (ctx.label || '') + ': ' + formatter.format(ctx.parsed) } }
                }
            }
        });
    }

    function renderCategories() {
        const chipsContainer = document.getElementById('categoryChips');
        if (chipsContainer) {
            chipsContainer.innerHTML = '';
            const katSelect = document.getElementById('kategori');
            if (katSelect) katSelect.innerHTML = '';
            categories.forEach((cat, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chip-btn' + (i === 0 ? ' active' : '');
                btn.textContent = cat.nama;
                btn.onclick = () => {
                    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (katSelect) katSelect.value = cat.nama;
                };
                chipsContainer.appendChild(btn);
                if (katSelect) {
                    const opt = document.createElement('option');
                    opt.value = cat.nama; opt.textContent = cat.nama;
                    if (i === 0) opt.selected = true;
                    katSelect.appendChild(opt);
                }
            });
        }
        if (categoryTableBody) {
            categoryTableBody.innerHTML = '';
            categories.forEach(cat => {
                const tr = document.createElement('div');
                tr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#FFF;border-radius:12px;box-shadow:0 2px 5px rgba(0,0,0,0.03);margin-bottom:8px;';
                const name = document.createElement('div'); name.textContent = cat.nama; name.style.cssText = 'font-weight:600;font-size:14px;';
                const del = document.createElement('button'); del.textContent = 'Hapus';
                del.style.cssText = 'background:rgba(239,68,68,0.1);color:#EF4444;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;';
                del.addEventListener('click', async () => {
                    if (transactions.some(t => t.kategori === cat.nama)) { alert('Kategori "' + cat.nama + '" sedang dipakai.'); return; }
                    const { error } = await sb.from('categories').delete().eq('id', cat.id);
                    if (error) { alert('Gagal: ' + error.message); return; }
                    await fetchAndRender();
                });
                tr.append(name, del);
                categoryTableBody.appendChild(tr);
            });
        }
    }

    function renderFilterCategories() {
        const filterKategori = document.getElementById('filterKategori');
        if (!filterKategori) return;
        const currentVal = filterKategori.value;
        filterKategori.innerHTML = '<option value="all">Semua Kategori</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.nama; opt.textContent = cat.nama;
            filterKategori.appendChild(opt);
        });
        if (currentVal && categories.some(c => c.nama === currentVal)) filterKategori.value = currentVal;
        else filterKategori.value = 'all';
    }

    async function fetchAndRender() {
        const tbody = document.getElementById('historyTableBody');
        if (tbody) tbody.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...</div>';

        const [{ data: txData, error: txError }, { data: catData, error: catError }] = await Promise.all([
            sb.from('transactions').select('*').order('created_at', { ascending: false }),
            sb.from('categories').select('*').order('created_at', { ascending: true })
        ]);

        if (txError) console.error('Tx error:', txError);
        else { transactions = txData || []; window.transactions = transactions; }
        if (catError) console.error('Cat error:', catError);
        else categories = catData || [];

        updateUI();
    }

    // Category form
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const katInput = document.getElementById('namaKategori');
            const newCat = katInput.value.trim();
            if (!newCat) return;
            if (categories.some(c => c.nama.toLowerCase() === newCat.toLowerCase())) { alert('Kategori sudah ada!'); return; }

            const { data: { user } } = await sb.auth.getUser();
            const { error } = await sb.from('categories').insert([{ nama: newCat, user_id: user.id }]);
            if (error) { alert('Gagal: ' + error.message); return; }
            categoryForm.reset();
            katInput.focus();
            await fetchAndRender();
        });
    }

    // Save transaction
    const saveBtn = document.getElementById('saveTransactionBtn');
    const deleteBtn = document.getElementById('deleteTransactionBtn');
    
    // Global function to open modal in EDIT mode
    window.openEditTransactionModal = function(t) {
        const modal = document.getElementById('transactionModal');
        modal.classList.add('active');
        
        // Set state
        document.getElementById('editingId').value = t.id;
        
        // Show delete button
        deleteBtn.style.display = 'block';
        
        // Set type
        const type = t.tipe || 'pengeluaran';
        const radios = document.querySelectorAll('input[name="tipe_numpad"][type="radio"]');
        radios.forEach(r => {
            r.checked = (r.value === type);
        });
        if (typeof window.updateFormTypeNumpad === 'function') {
            window.updateFormTypeNumpad(type);
        }
        
        // Set nominal
        window.numpadValue = String(t.nominal || 0);
        if (typeof window.updateAmountDisplay === 'function') {
            window.updateAmountDisplay();
        }
        
        // Set description
        document.getElementById('deskripsi').value = t.deskripsi === 'Tanpa Keterangan' ? '' : t.deskripsi;
        
        // Set active category chip
        const cat = t.kategori || 'Lainnya';
        document.querySelectorAll('.chip-btn').forEach(btn => {
            if (btn.textContent === cat) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        const katSelect = document.getElementById('kategori');
        if (katSelect) katSelect.value = cat;

        // Change save button text
        saveBtn.textContent = 'Simpan Perubahan';
    };

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const id = document.getElementById('editingId').value;
            const desc = document.getElementById('deskripsi').value || 'Transaksi';
            if (!id) return;
            if (!confirm(`Hapus transaksi "${desc}"?`)) return;

            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;

            const { error } = await sb.from('transactions').delete().eq('id', id);
            
            deleteBtn.innerHTML = 'Hapus';
            deleteBtn.disabled = false;

            if (error) {
                alert('Gagal: ' + error.message);
                return;
            }

            await fetchAndRender();
            if (typeof closeTransactionModal === 'function') closeTransactionModal();
        });
    }

    if (saveBtn) {
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const descInput = document.getElementById('deskripsi');
            const nomInput = document.getElementById('nominal');
            const tipeInput = document.getElementById('tipe');
            const editingIdInput = document.getElementById('editingId');
            const activeChip = document.querySelector('.chip-btn.active');
            let kat = 'Lainnya';
            if (activeChip) kat = activeChip.textContent;
            else { const hk = document.getElementById('kategori'); if (hk && hk.value) kat = hk.value; }

            const desc = descInput.value.trim() || 'Tanpa Keterangan';
            const nom = Number(nomInput.value.replace(/\D/g, ''));
            const tipe = tipeInput ? tipeInput.value : 'pengeluaran';
            const editingId = editingIdInput ? editingIdInput.value : '';
            
            if (isNaN(nom) || nom <= 0) { alert('Nominal tidak valid!'); return; }

            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            saveBtn.disabled = true;

            let result;
            if (editingId) {
                // UPDATE Mode
                result = await sb.from('transactions').update({
                    deskripsi: desc, nominal: nom, tipe: tipe, kategori: kat
                }).eq('id', editingId);
            } else {
                // INSERT Mode
                const { data: { user } } = await sb.auth.getUser();
                result = await sb.from('transactions').insert([{
                    deskripsi: desc, nominal: nom, tipe: tipe, kategori: kat, user_id: user.id
                }]);
            }

            saveBtn.innerHTML = editingId ? 'Simpan Perubahan' : 'Simpan Transaksi';
            saveBtn.disabled = false;
            if (result.error) { alert('Gagal: ' + result.error.message); return; }

            await fetchAndRender();
            descInput.value = '';
            nomInput.value = '0';
            if (editingIdInput) editingIdInput.value = '';
            if (typeof window.numpadValue !== 'undefined') window.numpadValue = '0';
            if (typeof window.updateAmountDisplay === 'function') window.updateAmountDisplay();
            if (typeof closeTransactionModal === 'function') closeTransactionModal();
        });
    }

    // Initial load
    await fetchAndRender();
}

// === GLOBAL ADVANCED HISTORY FILTER LOGIC ===
window.filterHistoryList = () => {
    const queryEl = document.getElementById('searchKeterangan');
    const waktuEl = document.getElementById('filterWaktu');
    const kategoriEl = document.getElementById('filterKategori');
    if (!queryEl || !waktuEl || !kategoriEl) return;

    const query = queryEl.value.toLowerCase().trim();
    const waktu = waktuEl.value;
    const kategori = kategoriEl.value;
    const listBody = document.getElementById('filterHistoryTableBody');
    if (!listBody) return;
    listBody.innerHTML = '';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const dataList = window.transactions || [];

    const filtered = dataList.filter(t => {
        const matchQuery = t.deskripsi.toLowerCase().includes(query);
        const matchCat = (kategori === 'all') || (t.kategori === kategori);
        const txTime = new Date(t.created_at).getTime();
        let matchTime = true;
        if (waktu === 'today') matchTime = txTime >= startOfDay;
        else if (waktu === 'month') matchTime = txTime >= startOfMonth;
        else if (waktu === 'year') matchTime = txTime >= startOfYear;
        return matchQuery && matchCat && matchTime;
    });

    if (filtered.length === 0) {
        listBody.innerHTML = '<div style="text-align:center;padding:32px;color:#6b7280;font-size:14px;">Tidak ada transaksi yang cocok.</div>';
        return;
    }

    const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    filtered.forEach(t => {
        const tr = document.createElement('div');
        const tipeIcon = String(t.tipe).toLowerCase();
        tr.style.cssText = 'display:flex;align-items:center;padding:16px;background:#FFF;border-radius:16px;box-shadow:0 2px 5px rgba(0,0,0,0.05);margin-bottom:12px;';

        const icon = document.createElement('div');
        icon.innerHTML = tipeIcon === 'pemasukan'
            ? '<i class="fa-solid fa-arrow-down" style="color:#10B981"></i>'
            : '<i class="fa-solid fa-arrow-up" style="color:#EF4444"></i>';
        icon.style.cssText = 'width:40px;height:40px;border-radius:50%;background:' + (tipeIcon === 'pemasukan' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') + ';display:flex;align-items:center;justify-content:center;margin-right:12px;';

        const details = document.createElement('div'); details.style.flex = '1';
        const d = document.createElement('div'); d.textContent = t.deskripsi; d.style.cssText = 'font-weight:600;font-size:14px;color:#1A1A1A;';
        const txDate = new Date(t.created_at);
        const c = document.createElement('div');
        c.textContent = (t.kategori || 'Lainnya') + ' \u2022 ' + txDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        c.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px;';
        details.append(d, c);

        const nom = document.createElement('div');
        nom.textContent = fmt.format(t.nominal);
        nom.style.cssText = 'font-weight:700;font-size:15px;color:' + (tipeIcon === 'pemasukan' ? '#10B981' : '#EF4444') + ';margin-right:12px;';

        // Make row clickable to edit
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openEditTransactionModal(t);
        });

        tr.append(icon, details, nom);
        listBody.appendChild(tr);
    });
};

// === GLOBAL EXPORT & RESET ===
window.exportToCSV = () => {
    if (!window.transactions || window.transactions.length === 0) { alert('Tidak ada data!'); return; }
    let csv = "data:text/csv;charset=utf-8,ID,Tanggal,Deskripsi,Kategori,Nominal,Tipe\n";
    window.transactions.forEach(t => {
        csv += '"' + t.id + '","' + t.created_at + '","' + t.deskripsi + '","' + (t.kategori || '') + '",' + t.nominal + ',"' + t.tipe + '"\n';
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'Money_Tracker_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

window.dangerResetDatabase = async () => {
    if (!confirm('Hapus SELURUH transaksi? Ini permanen!')) return;
    if (prompt("Ketik 'HAPUS' untuk konfirmasi:") !== 'HAPUS') { alert('Dibatalkan.'); return; }
    const { error } = await sb.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) alert('Gagal: ' + error.message);
    else { alert('Database dibersihkan!'); await window.fetchAndRenderGlobal(); }
};
