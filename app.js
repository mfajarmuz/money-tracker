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

// Helper multi-login sessions storage
function getStoredSessions() {
    try {
        return JSON.parse(localStorage.getItem('mt_sessions') || '[]');
    } catch(e) {
        return [];
    }
}

function saveSessions(sessions) {
    localStorage.setItem('mt_sessions', JSON.stringify(sessions));
}

function addSessionToList(session) {
    if (!session || !session.user) return;
    let sessions = getStoredSessions();
    // Remove if exists to update with fresh tokens
    sessions = sessions.filter(s => s.user.id !== session.user.id);
    sessions.push({
        user: session.user,
        access_token: session.access_token,
        refresh_token: session.refresh_token
    });
    saveSessions(sessions);
    localStorage.setItem('mt_current_user_id', session.user.id);
}

// Wrap all DOM-dependent code
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
    renderAccountsList(user);
    initApp();
}

// Render multi-account list in settings
function renderAccountsList(currentUser) {
    const listEl = document.getElementById('accountsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const sessions = getStoredSessions();
    if (sessions.length === 0 && currentUser) {
        // Fallback if current user session is active but not stored in multi-login yet
        const { data: { session } } = sb.auth.getSession();
        if (session) {
            addSessionToList(session);
        }
    }

    // Re-get list after fallback update
    const activeSessions = getStoredSessions();

    activeSessions.forEach(s => {
        const isCurrent = s.user.id === currentUser.id;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid ' + (isCurrent ? '#3b82f6' : '#e2e8f0') + ';margin-bottom:8px;';

        const info = document.createElement('div');
        info.style.flex = '1';
        if (!isCurrent) {
            info.style.cursor = 'pointer';
            info.addEventListener('click', () => window.switchAccount(s.user.id));
        }
        
        const name = document.createElement('div');
        name.textContent = s.user.email || 'User';
        name.style.cssText = 'font-weight:600;font-size:13px;color:#1e293b;';
        const badge = document.createElement('span');
        badge.textContent = isCurrent ? 'Aktif' : 'Klik untuk beralih';
        badge.style.cssText = 'font-size:10px;color:' + (isCurrent ? '#3b82f6' : '#64748b') + ';font-weight:' + (isCurrent ? 'bold' : 'normal') + ';';
        info.append(name, badge);

        const actions = document.createElement('div');
        const logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        logoutBtn.style.cssText = 'background:none;border:none;color:#ef4444;cursor:pointer;padding:6px;font-size:14px;';
        logoutBtn.title = 'Hapus akun ini';
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.removeAccount(s.user.id);
        });
        actions.appendChild(logoutBtn);

        row.append(info, actions);
        listEl.appendChild(row);
    });
}

// Switch Active Account
window.switchAccount = async function(userId) {
    const sessions = getStoredSessions();
    const target = sessions.find(s => s.user.id === userId);
    if (!target) return;

    // Load new session into Supabase client
    const { error } = await sb.auth.setSession({
        access_token: target.access_token,
        refresh_token: target.refresh_token
    });

    if (error) {
        alert('Gagal beralih akun: ' + error.message);
        window.removeAccount(userId);
        return;
    }

    localStorage.setItem('mt_current_user_id', userId);
    location.reload();
};

// Remove / Logout specific account
window.removeAccount = async function(userId) {
    let sessions = getStoredSessions();
    const currentUserId = localStorage.getItem('mt_current_user_id');

    if (userId === currentUserId) {
        await sb.auth.signOut();
        sessions = sessions.filter(s => s.user.id !== userId);
        saveSessions(sessions);
        localStorage.removeItem('mt_current_user_id');
        location.reload();
    } else {
        sessions = sessions.filter(s => s.user.id !== userId);
        saveSessions(sessions);
        location.reload();
    }
};

// Add New Account button trigger
window.addNewAccount = async function() {
    const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: {
                prompt: 'select_account'
            }
        }
    });
    if (error) alert('Gagal menambah akun: ' + error.message);
};

// Google Login Event Listener
const googleBtn = document.getElementById('googleLoginBtn');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan...';
        
        const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) {
            alert('Gagal login dengan Google: ' + error.message);
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<i class="fa-brands fa-google" style="color: #ea4335; font-size: 18px;"></i> Masuk dengan Google';
        }
    });
}

// Check existing session on load
(async function initAuth() {
    // Check if we are returning from a Google OAuth redirect (hash contains tokens)
    const isOAuthCallback = window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='));

    // Check if we need to load a specific user session from multi-login on startup
    const currentUserId = localStorage.getItem('mt_current_user_id');
    const sessions = getStoredSessions();

    if (!isOAuthCallback && currentUserId && sessions.length > 0) {
        const currentSession = sessions.find(s => s.user.id === currentUserId);
        if (currentSession) {
            await sb.auth.setSession({
                access_token: currentSession.access_token,
                refresh_token: currentSession.refresh_token
            });
        }
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        addSessionToList(session);
        showApp(session.user);
    } else {
        showAuthScreen();
    }

    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            addSessionToList(session);
            showApp(session.user);
        } else if (event === 'SIGNED_OUT') {
            showAuthScreen();
        }
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

        // Calculate overall totals from all transactions
        transactions.forEach(t => {
            const nominalAngka = Number(t.nominal) || 0;
            const tTipe = String(t.tipe).toLowerCase();
            if (tTipe === 'pemasukan') totalPemasukan += nominalAngka;
            else totalPengeluaran += nominalAngka;
        });

        // Render only the first 6 recent transactions to the dashboard list
        transactions.slice(0, 6).forEach(t => {
            const tTipe = String(t.tipe).toLowerCase();

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

                // Make row clickable to open details page
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    openTransactionDetailPage(t);
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
    
    // State for deletion
    let transactionIdToDelete = null;

    // Handle Confirm Delete button click (bind once, permanent listener)
    const btnConfirmDeleteAction = document.getElementById('btnConfirmDeleteAction');
    if (btnConfirmDeleteAction) {
        btnConfirmDeleteAction.addEventListener('click', async () => {
            if (!transactionIdToDelete) return;
            
            btnConfirmDeleteAction.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Hapus...';
            btnConfirmDeleteAction.disabled = true;

            const { error } = await sb.from('transactions').delete().eq('id', transactionIdToDelete);
            
            btnConfirmDeleteAction.innerHTML = 'Hapus';
            btnConfirmDeleteAction.disabled = false;

            if (error) {
                alert('Gagal menghapus: ' + error.message);
                return;
            }

            await fetchAndRender();
            closeDeleteConfirmModal();
            closeDetailPage();
            transactionIdToDelete = null;
        });
    }

    // Global function to open details page
    window.openTransactionDetailPage = function(t) {
        // Record current active view before transitioning so we can navigate back correctly
        const currentActiveView = document.querySelector('.view.active');
        if (currentActiveView && currentActiveView.id !== 'detail_transaksi') {
            window.previousActiveViewId = currentActiveView.id;
        }

        // Hide other views, show detail view
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('detail_transaksi').classList.add('active');

        // Format Date
        const txDate = new Date(t.created_at);
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const formattedDate = `${days[txDate.getDay()]}, ${txDate.getDate()} ${months[txDate.getMonth()]} ${txDate.getFullYear()}`;
        const formattedTime = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // Update Text Content
        const amountEl = document.getElementById('detailAmount');
        const badgeEl = document.getElementById('detailTypeBadge');
        const headerSec = document.getElementById('detailHeaderSection');
        
        const isIncome = String(t.tipe).toLowerCase() === 'pemasukan';
        amountEl.textContent = (isIncome ? '+' : '-') + formatter.format(t.nominal);
        badgeEl.textContent = isIncome ? 'Pemasukan' : 'Pengeluaran';

        if (isIncome) {
            headerSec.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
            badgeEl.style.background = 'rgba(255, 255, 255, 0.2)';
        } else {
            headerSec.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
            badgeEl.style.background = 'rgba(255, 255, 255, 0.2)';
        }

        document.getElementById('detailCategory').textContent = t.kategori || 'Lainnya';
        document.getElementById('detailDate').textContent = formattedDate;
        document.getElementById('detailTime').textContent = formattedTime;
        document.getElementById('detailDescription').textContent = t.deskripsi || 'Tanpa Keterangan';
        
        // Metadata
        const shortId = t.id ? '#' + t.id.substring(0, 8).toUpperCase() : '#-';
        document.getElementById('metaTxId').textContent = shortId;
        document.getElementById('metaCreatedAt').textContent = `${formattedDate}, ${formattedTime}`;

        // Rebind Action Buttons inside Detail Page
        const editBtn = document.getElementById('detailEditBtn');
        const delBtn = document.getElementById('detailDeleteBtn');

        // Clear existing listeners by replacing buttons (only for edit button, delete is simple click now)
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.replaceWith(newEditBtn);

        newEditBtn.addEventListener('click', () => {
            // Open full-screen Edit Page view instead of numpad modal
            openEditTransactionPage(t);
        });

        // Simpler delete click listener: just set global state and show modal
        const newDelBtn = delBtn.cloneNode(true);
        delBtn.replaceWith(newDelBtn);
        
        newDelBtn.addEventListener('click', () => {
            transactionIdToDelete = t.id;
            document.getElementById('deleteConfirmDesc').textContent = `"${t.deskripsi || 'Transaksi'}"`;
            document.getElementById('deleteConfirmModal').classList.add('active');
        });
    };

    // Global function to open NEW Edit Page view (matching screenshot)
    window.openEditTransactionPage = function(t) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('edit_transaction_view').classList.add('active');

        // Setup form values
        document.getElementById('editPageTxId').value = t.id;
        document.getElementById('editPageAmount').value = Number(t.nominal || 0).toLocaleString('id-ID');
        document.getElementById('editPageDescription').value = t.deskripsi === 'Tanpa Keterangan' ? '' : (t.deskripsi || '');
        
        const txDate = new Date(t.created_at);
        const yyyy = txDate.getFullYear();
        const mm = String(txDate.getMonth() + 1).padStart(2, '0');
        const dd = String(txDate.getDate()).padStart(2, '0');
        const hh = String(txDate.getHours()).padStart(2, '0');
        const min = String(txDate.getMinutes()).padStart(2, '0');
        
        document.getElementById('editPageDate').value = `${yyyy}-${mm}-${dd}`;
        document.getElementById('editPageTime').value = `${hh}:${min}`;

        // Set type
        setEditPageType(t.tipe || 'pengeluaran');

        // Render Category Grid with Icons
        renderEditPageCategoryGrid(t.kategori || 'Lainnya');
    };

    // Helper for segmented control type switcher
    window.setEditPageType = function(type) {
        document.getElementById('editPageTxType').value = type;
        const btnPengeluaran = document.getElementById('btnEditTypePengeluaran');
        const btnPemasukan = document.getElementById('btnEditTypePemasukan');

        if (type === 'pengeluaran') {
            btnPengeluaran.style.cssText = 'flex:1;padding:12px;border:none;border-radius:20px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:#ef4444;color:white;';
            btnPemasukan.style.cssText = 'flex:1;padding:12px;border:none;border-radius:20px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:transparent;color:#64748b;';
        } else {
            btnPengeluaran.style.cssText = 'flex:1;padding:12px;border:none;border-radius:20px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:transparent;color:#64748b;';
            btnPemasukan.style.cssText = 'flex:1;padding:12px;border:none;border-radius:20px;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:#3b82f6;color:white;';
        }
    };

    // Category Grid Renderer with matching icons
    function renderEditPageCategoryGrid(selectedCategory) {
        const gridEl = document.getElementById('editPageCategoryGrid');
        if (!gridEl) return;
        gridEl.innerHTML = '';

        // Default categories with predefined icons
        const iconMapping = {
            'makanan': 'fa-utensils',
            'belanja': 'fa-bag-shopping',
            'hiburan': 'fa-ticket',
            'tagihan': 'fa-file-invoice-dollar',
            'transportasi': 'fa-car',
            'gaji': 'fa-money-bill-wave'
        };

        // Standardize local names to icons
        const getIconClass = (name) => {
            const lower = String(name).toLowerCase();
            return iconMapping[lower] || 'fa-ellipsis';
        };

        categories.forEach(cat => {
            const isSelected = cat.nama === selectedCategory;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;text-align:left;';
            
            if (isSelected) {
                btn.style.cssText += 'background:rgba(59,130,246,0.06);border:1.5px solid #3b82f6;color:#3b82f6;';
            } else {
                btn.style.cssText += 'background:white;border:1.5px solid #e2e8f0;color:#64748b;';
            }

            const icon = document.createElement('i');
            icon.className = `fa-solid ${getIconClass(cat.nama)}`;
            icon.style.fontSize = '14px';
            
            const text = document.createElement('span');
            text.textContent = cat.nama;

            btn.append(icon, text);

            btn.addEventListener('click', () => {
                document.getElementById('editPageTxCategory').value = cat.nama;
                renderEditPageCategoryGrid(cat.nama);
            });

            gridEl.appendChild(btn);
        });

        // Store selected category value
        document.getElementById('editPageTxCategory').value = selectedCategory;
    }

    // Submit Action for the Edit Page View
    window.submitEditForm = async function() {
        const id = document.getElementById('editPageTxId').value;
        const amountRaw = document.getElementById('editPageAmount').value;
        const nominal = Number(amountRaw.replace(/\D/g, ''));
        const tipe = document.getElementById('editPageTxType').value;
        const kategori = document.getElementById('editPageTxCategory').value;
        const deskripsi = document.getElementById('editPageDescription').value.trim() || 'Tanpa Keterangan';
        
        const dateVal = document.getElementById('editPageDate').value;
        const timeVal = document.getElementById('editPageTime').value;

        if (isNaN(nominal) || nominal <= 0) {
            alert('Nominal tidak valid!');
            return;
        }

        const submitBtn = document.getElementById('editPageSubmitBtn');
        submitBtn.textContent = 'Menyimpan...';
        submitBtn.disabled = true;

        // Construct ISO Date with timezone offset compatibility
        const created_at = new Date(`${dateVal}T${timeVal}:00`).toISOString();

        const { error } = await sb.from('transactions').update({
            deskripsi, nominal, tipe, kategori, created_at
        }).eq('id', id);

        submitBtn.textContent = 'Simpan Perubahan';
        submitBtn.disabled = false;

        if (error) {
            alert('Gagal menyimpan: ' + error.message);
            return;
        }

        await fetchAndRender();
        
        // Return to Detail page and update its display
        const { data: updatedTx } = await sb.from('transactions').select('*').eq('id', id).single();
        if (updatedTx) {
            openTransactionDetailPage(updatedTx);
        } else {
            closeDetailPage();
        }
    };

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
    const kategoriEl = document.getElementById('filterKategori');
    const tahunEl = document.getElementById('filterTahun');
    const bulanEl = document.getElementById('filterBulan');
    const tanggalEl = document.getElementById('filterTanggal');
    
    if (!queryEl || !kategoriEl || !tahunEl || !bulanEl || !tanggalEl) return;

    const query = queryEl.value.toLowerCase().trim();
    const kategori = kategoriEl.value;
    const tahun = tahunEl.value;
    const bulan = bulanEl.value;
    const tanggal = tanggalEl.value; // YYYY-MM-DD format
    
    const listBody = document.getElementById('filterHistoryTableBody');
    if (!listBody) return;
    listBody.innerHTML = '';

    const dataList = window.transactions || [];

    const filtered = dataList.filter(t => {
        const matchQuery = t.deskripsi.toLowerCase().includes(query);
        const matchCat = (kategori === 'all') || (t.kategori === kategori);
        
        const txDate = new Date(t.created_at);
        
        // Filter Tahun
        const matchTahun = (tahun === 'all') || (txDate.getFullYear().toString() === tahun);
        
        // Filter Bulan
        const matchBulan = (bulan === 'all') || (txDate.getMonth().toString() === bulan);
        
        // Filter Hari / Tanggal Spesifik
        let matchTanggal = true;
        if (tanggal) {
            const yyyy = txDate.getFullYear();
            const mm = String(txDate.getMonth() + 1).padStart(2, '0');
            const dd = String(txDate.getDate()).padStart(2, '0');
            const formattedTxDate = `${yyyy}-${mm}-${dd}`;
            matchTanggal = formattedTxDate === tanggal;
        }

        return matchQuery && matchCat && matchTahun && matchBulan && matchTanggal;
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

        // Make row clickable to open details page
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openTransactionDetailPage(t);
        });

        tr.append(icon, details, nom);
        listBody.appendChild(tr);
    });
};

// === GLOBAL EXPORT & RESET ===
window.exportToPDF = async () => {
    const startInput = document.getElementById('pdfStartDate').value;
    const endInput = document.getElementById('pdfEndDate').value;

    if (!startInput || !endInput) {
        alert("Pilih rentang tanggal mulai dan selesai terlebih dahulu!");
        return;
    }

    const startDate = new Date(startInput + 'T00:00:00');
    const endDate = new Date(endInput + 'T23:59:59');

    if (endDate < startDate) {
        alert("Tanggal selesai tidak boleh mendahului tanggal mulai!");
        return;
    }

    const allData = window.transactions || [];
    
    // 1. Calculate Saldo Awal (cumulative balance of all transactions BEFORE startDate)
    let saldoAwal = 0;
    allData.forEach(t => {
        const txTime = new Date(t.created_at);
        if (txTime < startDate) {
            const nominal = Number(t.nominal) || 0;
            const isIncome = String(t.tipe).toLowerCase() === 'pemasukan';
            if (isIncome) saldoAwal += nominal;
            else saldoAwal -= nominal;
        }
    });

    // 2. Filter transactions in the selected date range
    const filtered = allData.filter(t => {
        const txTime = new Date(t.created_at);
        return txTime >= startDate && txTime <= endDate;
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fetch user details for statement header
    const { data: { user } } = await sb.auth.getUser();
    const userEmail = user ? user.email : 'User';

    // Format Dates for header
    const formatStatementDate = (dStr) => {
        const d = new Date(dStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // 1. PDF Title & Bank Header Style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("REKENING KORAN", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Laporan Mutasi Keuangan Pribadi", 14, 25);

    // Divider Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 29, 196, 29);

    // 2. Metadata Info Grid
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Pemilik Rekening:", 14, 36);
    doc.setFont("helvetica", "normal");
    doc.text(userEmail, 45, 36);

    doc.setFont("helvetica", "bold");
    doc.text("Periode Laporan:", 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatStatementDate(startDate)} - ${formatStatementDate(endDate)}`, 45, 42);

    doc.setFont("helvetica", "bold");
    doc.text("Tanggal Cetak:", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleString('id-ID'), 45, 48);

    // 3. Process Transaction Rows & Calculate Balances starting from Saldo Awal
    let runningBalance = saldoAwal;
    let totalDebit = 0; // Income
    let totalKredit = 0; // Expense

    // Row 0 is the starting balance row
    const tableRows = [
        [
            "-",
            "-",
            "SALDO AWAL PERIODE",
            "-",
            "-",
            "-",
            "Rp " + saldoAwal.toLocaleString('id-ID')
        ]
    ];

    filtered.forEach((t, index) => {
        const nominal = Number(t.nominal) || 0;
        const isIncome = String(t.tipe).toLowerCase() === 'pemasukan';
        
        let debitStr = "-";
        let kreditStr = "-";

        if (isIncome) {
            runningBalance += nominal;
            totalDebit += nominal;
            debitStr = "Rp " + nominal.toLocaleString('id-ID');
        } else {
            runningBalance -= nominal;
            totalKredit += nominal;
            kreditStr = "Rp " + nominal.toLocaleString('id-ID');
        }

        const tDate = new Date(t.created_at);
        const formattedTxDate = tDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) + ' ' + tDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        tableRows.push([
            index + 1,
            formattedTxDate,
            t.deskripsi || 'Tanpa Keterangan',
            t.kategori || 'Lainnya',
            debitStr,
            kreditStr,
            "Rp " + runningBalance.toLocaleString('id-ID')
        ]);
    });

    // 4. Render Table using AutoTable plugin with clean styles
    doc.autoTable({
        startY: 54,
        head: [['No', 'Tanggal', 'Keterangan', 'Kategori', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 41, 59], // Slate-800
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 26, halign: 'center' },
            2: { cellWidth: 54 },
            3: { cellWidth: 22, halign: 'center' },
            4: { halign: 'right', cellWidth: 28 },
            5: { halign: 'right', cellWidth: 28 },
            6: { halign: 'right', cellWidth: 28 }
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            valign: 'middle'
        },
        didParseCell: function (data) {
            // Style the Saldo Awal row to look slightly distinct (italic/bold)
            if (data.row.index === 0) {
                data.cell.styles.fontStyle = 'bold';
                if (data.column.index === 2) {
                    data.cell.styles.textColor = [100, 116, 139]; // slate-500
                }
            }
        }
    });

    // 5. Append Summary / Total Rekap below table
    const finalY = doc.lastAutoTable.finalY + 12;

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, finalY - 4, 196, finalY - 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    doc.text("RINGKASAN MUTASI", 14, finalY);
    
    doc.setFontSize(9);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Saldo Awal Periode:`, 14, finalY + 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Rp ${saldoAwal.toLocaleString('id-ID')}`, 70, finalY + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Pemasukan (Debit):`, 14, finalY + 14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // green
    doc.text(`+ Rp ${totalDebit.toLocaleString('id-ID')}`, 70, finalY + 14);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Pengeluaran (Kredit):`, 14, finalY + 20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68); // red
    doc.text(`- Rp ${totalKredit.toLocaleString('id-ID')}`, 70, finalY + 20);

    // Divider for final balance
    doc.setDrawColor(226, 232, 240);
    doc.line(14, finalY + 24, 100, finalY + 24);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`Saldo Akhir Periode:`, 14, finalY + 29);
    const balanceColor = runningBalance >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.text(`Rp ${runningBalance.toLocaleString('id-ID')}`, 70, finalY + 29);

    // Save generated PDF
    const filename = `Rekening_Koran_${startInput}_sd_${endInput}.pdf`;
    doc.save(filename);
};

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
