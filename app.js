document.addEventListener('DOMContentLoaded', async () => {
    // Supabase Init
    const supabaseUrl = 'https://rcclzilnplzpixsbtabx.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjY2x6aWxucGx6cGl4c2J0YWJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ2MjAzOCwiZXhwIjoyMDk5MDM4MDM4fQ.pc_QJ6hBvL95t3fZQ2Cg7yAQA5LtLqst0EFAX_BNoZU';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = supabase;
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
    const form = document.getElementById('transactionForm');
    const tableBody = document.getElementById('historyTableBody');
    const totalSaldoEl = document.getElementById('totalSaldo');
    const sumPemasukanEl = document.getElementById('summaryPemasukan');
    const sumPengeluaranEl = document.getElementById('summaryPengeluaran');
    const sumTransaksiEl = document.getElementById('summaryTransaksi');
    const chartCanvas = document.getElementById('financeChart');
    const categoryForm = document.getElementById('categoryForm');
    const categoryTableBody = document.getElementById('categoryTableBody');
    let kategoriSelect = document.getElementById('kategori');
    
    // State
    let transactions = [];
    let categories = [];
    let chartInstance = null;
    let currentFilter = 'all'; // 'all', 'month', 'today'
    window.transactions = []; // Global backup for filter history
    
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
        
        // Filter transactions for report logic
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        
        let reportTransactions = transactions;
        if (currentFilter === 'month') {
            reportTransactions = transactions.filter(t => t.created_at >= startOfMonth);
        } else if (currentFilter === 'today') {
            reportTransactions = transactions.filter(t => t.created_at >= startOfDay);
        }

        // Render Table (XSS Safe via createElement) - for dashboard (always shows all)
        if (tableBody) {
            tableBody.innerHTML = '';
        }
        
        // For Dashboard (Overall)
        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        
        transactions.forEach((t, index) => {
            const nominalAngka = Number(t.nominal) || 0;
            const tTipe = String(t.tipe).toLowerCase();

            if (tTipe === 'pemasukan') totalPemasukan += nominalAngka;
            else totalPengeluaran += nominalAngka;
            
            if (tableBody) {
                const tr = document.createElement('div');
                tr.setAttribute('data-tipe', t.tipe);
                tr.style.display = 'flex';
                tr.style.alignItems = 'center';
                tr.style.padding = '16px';
                tr.style.background = '#FFFFFF';
                tr.style.borderRadius = '16px';
                tr.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                tr.style.marginBottom = '12px';
                tr.style.position = 'relative';
                
                const iconWrapper = document.createElement('div');
                iconWrapper.innerHTML = tTipe === 'pemasukan' 
                    ? '<i class="fa-solid fa-arrow-down" style="color: #10B981"></i>' 
                    : '<i class="fa-solid fa-arrow-up" style="color: #EF4444"></i>';
                iconWrapper.style.width = '40px';
                iconWrapper.style.height = '40px';
                iconWrapper.style.borderRadius = '50%';
                iconWrapper.style.background = tTipe === 'pemasukan' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                iconWrapper.style.display = 'flex';
                iconWrapper.style.alignItems = 'center';
                iconWrapper.style.justifyContent = 'center';
                iconWrapper.style.marginRight = '12px';

                const tdDesc = document.createElement('div');
                tdDesc.textContent = t.deskripsi;
                tdDesc.style.fontWeight = '600';
                tdDesc.style.fontSize = '14px';
                tdDesc.style.color = '#1A1A1A';
                
                const txDate = new Date(t.created_at);
                const formattedDate = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                const formattedTime = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                
                const tdCat = document.createElement('div');
                tdCat.textContent = `${t.kategori || 'Lainnya'} • ${formattedDate} ${formattedTime}`;
                tdCat.style.fontSize = '11px';
                tdCat.style.color = '#6B7280';
                tdCat.style.marginTop = '2px';
                
                const textWrapper = document.createElement('div');
                textWrapper.style.flex = '1';
                textWrapper.append(tdDesc, tdCat);

                const tdNom = document.createElement('div');
                tdNom.textContent = formatter.format(t.nominal);
                tdNom.style.fontWeight = '700';
                tdNom.style.fontSize = '15px';
                tdNom.style.color = tTipe === 'pemasukan' ? '#10B981' : '#EF4444';
                tdNom.style.marginRight = '12px';

                const tdAction = document.createElement('div');
                const btnDelete = document.createElement('button');
                btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
                btnDelete.className = 'btn-delete';
                btnDelete.style.background = 'rgba(239, 68, 68, 0.1)';
                btnDelete.style.color = '#EF4444';
                btnDelete.style.border = 'none';
                btnDelete.style.width = '32px';
                btnDelete.style.height = '32px';
                btnDelete.style.borderRadius = '50%';
                btnDelete.style.cursor = 'pointer';
                btnDelete.style.display = 'flex';
                btnDelete.style.alignItems = 'center';
                btnDelete.style.justifyContent = 'center';
                
                btnDelete.addEventListener('click', async () => {
                    const confirmDel = confirm(`Apakah Anda yakin ingin menghapus transaksi "${t.deskripsi}"?`);
                    if (!confirmDel) return;
                    
                    const { error } = await supabase.from('transactions').delete().eq('id', t.id);
                    if (error) {
                        alert('Gagal menghapus: ' + error.message);
                        return;
                    }
                    await fetchAndRender();
                });
                tdAction.appendChild(btnDelete);

                tr.append(iconWrapper, textWrapper, tdNom, tdAction);
                tableBody.appendChild(tr);
            }
        });
        
        // Update Dashboard Balance
        const totalSaldo = totalPemasukan - totalPengeluaran;
        if(totalSaldoEl) totalSaldoEl.textContent = formatter.format(totalSaldo);
        
        // Update Report Summaries
        let reportPemasukan = 0;
        let reportPengeluaran = 0;
        let expenseByCategory = {};
        let expenseTransactions = [];
        
        reportTransactions.forEach(t => {
            const nominalAngka = Number(t.nominal) || 0;
            const tTipe = String(t.tipe).toLowerCase();
            const cat = t.kategori || 'Lainnya';

            if (tTipe === 'pemasukan') {
                reportPemasukan += nominalAngka;
            } else {
                reportPengeluaran += nominalAngka;
                expenseByCategory[cat] = (expenseByCategory[cat] || 0) + nominalAngka;
                expenseTransactions.push(t);
            }
        });
        
        // Update header dashboard (Pemasukan & Pengeluaran ringkas)
        const headIn = document.getElementById('headerPemasukan');
        const headOut = document.getElementById('headerPengeluaran');
        if(headIn) headIn.textContent = formatter.format(totalPemasukan);
        if(headOut) headOut.textContent = formatter.format(totalPengeluaran);
        
        // Summary on Report View
        if(sumPemasukanEl) sumPemasukanEl.textContent = formatter.format(reportPemasukan);
        if(sumPengeluaranEl) sumPengeluaranEl.textContent = formatter.format(reportPengeluaran);
        if(sumTransaksiEl) sumTransaksiEl.textContent = formatter.format(reportPemasukan - reportPengeluaran);
        
        updateChart(expenseByCategory);
        renderTopExpenses(expenseTransactions);
        
        // Update advanced history view jika ada
        if (typeof window.filterHistoryList === 'function') {
            window.filterHistoryList();
        }
    }
    
    function renderTopExpenses(expenseTxs) {
        const topList = document.getElementById('topExpensesList');
        if (!topList) return;
        topList.innerHTML = '';
        
        // Sort descending
        const sorted = [...expenseTxs].sort((a, b) => Number(b.nominal) - Number(a.nominal)).slice(0, 3);
        
        if (sorted.length === 0) {
            topList.innerHTML = '<p style="text-align: center; color: var(--clr-text-muted); font-size: 14px; padding: 16px;">Tidak ada pengeluaran di periode ini.</p>';
            return;
        }

        sorted.forEach(t => {
            const tr = document.createElement('div');
            tr.style.display = 'flex';
            tr.style.alignItems = 'center';
            tr.style.padding = '12px 16px';
            tr.style.background = '#FFFFFF';
            tr.style.borderRadius = '12px';
            tr.style.boxShadow = '0 2px 5px rgba(0,0,0,0.03)';
            tr.style.marginBottom = '8px';
            
            const iconWrapper = document.createElement('div');
            iconWrapper.innerHTML = '<i class="fa-solid fa-arrow-up" style="color: #EF4444"></i>';
            iconWrapper.style.width = '36px';
            iconWrapper.style.height = '36px';
            iconWrapper.style.borderRadius = '50%';
            iconWrapper.style.background = 'rgba(239, 68, 68, 0.1)';
            iconWrapper.style.display = 'flex';
            iconWrapper.style.alignItems = 'center';
            iconWrapper.style.justifyContent = 'center';
            iconWrapper.style.marginRight = '12px';

            const textWrapper = document.createElement('div');
            textWrapper.style.flex = '1';
            
            const tdDesc = document.createElement('div');
            tdDesc.textContent = t.deskripsi;
            tdDesc.style.fontWeight = '600';
            tdDesc.style.fontSize = '13px';
            tdDesc.style.color = '#1A1A1A';
            
            const tdCat = document.createElement('div');
            tdCat.textContent = t.kategori || 'Lainnya';
            tdCat.style.fontSize = '11px';
            tdCat.style.color = '#6B7280';
            
            textWrapper.append(tdDesc, tdCat);
            
            const tdNom = document.createElement('div');
            tdNom.textContent = formatter.format(t.nominal);
            tdNom.style.fontWeight = '700';
            tdNom.style.fontSize = '14px';
            tdNom.style.color = '#EF4444';
            
            tr.append(iconWrapper, textWrapper, tdNom);
            topList.appendChild(tr);
        });
    }
    
    function updateChart(expenseByCategory) {
        if (!chartCanvas) return;
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        const labels = Object.keys(expenseByCategory);
        const data = Object.values(expenseByCategory);
        
        if (labels.length === 0) {
            return;
        }

        const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

        chartInstance = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) label += formatter.format(context.parsed);
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderCategories() {
        const chipsContainer = document.getElementById('categoryChips');
        if(chipsContainer) {
            chipsContainer.innerHTML = '';
            const katSelect = document.getElementById('kategori');
            if(katSelect) katSelect.innerHTML = '';

            categories.forEach((cat, index) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chip-btn';
                if(index === 0) btn.classList.add('active');
                btn.textContent = cat.nama;
                btn.onclick = () => {
                    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if(katSelect) katSelect.value = cat.nama;
                };
                chipsContainer.appendChild(btn);

                if(katSelect) {
                    const opt = document.createElement('option');
                    opt.value = cat.nama;
                    opt.textContent = cat.nama;
                    if(index === 0) opt.selected = true;
                    katSelect.appendChild(opt);
                }
            });
        }

        // Update table in Settings view
        if (categoryTableBody) {
            categoryTableBody.innerHTML = '';
            categories.forEach((cat, index) => {
                const tr = document.createElement('div');
                tr.style.display = 'flex';
                tr.style.justifyContent = 'space-between';
                tr.style.alignItems = 'center';
                tr.style.padding = '12px 16px';
                tr.style.background = '#FFFFFF';
                tr.style.borderRadius = '12px';
                tr.style.boxShadow = '0 2px 5px rgba(0,0,0,0.03)';
                tr.style.marginBottom = '8px';
                
                const tdName = document.createElement('div');
                tdName.textContent = cat.nama;
                tdName.style.fontWeight = '600';
                tdName.style.fontSize = '14px';
                
                const tdAction = document.createElement('div');
                const btnDelete = document.createElement('button');
                btnDelete.textContent = 'Hapus';
                btnDelete.className = 'btn-delete';
                btnDelete.style.background = 'rgba(239, 68, 68, 0.1)';
                btnDelete.style.color = '#EF4444';
                btnDelete.style.border = 'none';
                btnDelete.style.padding = '6px 12px';
                btnDelete.style.borderRadius = '6px';
                btnDelete.style.cursor = 'pointer';
                
                btnDelete.addEventListener('click', async () => {
                    const isUsed = transactions.some(t => t.kategori === cat.nama);
                    if (isUsed) {
                        alert(`Kategori "${cat.nama}" tidak bisa dihapus karena sedang digunakan dalam transaksi.`);
                        return;
                    }
                    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
                    if (error) {
                        alert('Gagal menghapus kategori: ' + error.message);
                        return;
                    }
                    await fetchAndRender();
                });
                tdAction.appendChild(btnDelete);
                
                tr.append(tdName, tdAction);
                categoryTableBody.appendChild(tr);
            });
        }
    }
    
    async function fetchAndRender() {
        const tbody = document.getElementById('historyTableBody');
        if (tbody) {
            tbody.innerHTML = '<div id="loadingState" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...</div>';
        }
        
        const [{ data: txData, error: txError }, { data: catData, error: catError }] = await Promise.all([
            supabase.from('transactions').select('*').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('created_at', { ascending: true })
        ]);

        if (txError) console.error('Error fetching transactions:', txError);
        else {
            transactions = txData || [];
            window.transactions = transactions; // Sync to global window
        }

        if (catError) console.error('Error fetching categories:', catError);
        else categories = catData || [];

        updateUI();
    }
    
    if(categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const katInput = document.getElementById('namaKategori');
            const newCat = katInput.value.trim();
            
            if (!newCat) return;
            if (categories.some(c => c.nama.toLowerCase() === newCat.toLowerCase())) {
                alert('Kategori sudah ada!');
                return;
            }
            
            const { error } = await supabase.from('categories').insert([{ nama: newCat }]);
            if (error) {
                alert('Gagal menambah kategori: ' + error.message);
                return;
            }

            categoryForm.reset();
            katInput.focus();
            await fetchAndRender();
        });
    }

    // Save Button Event Handler
    const saveBtn = document.getElementById('saveTransactionBtn');
    if (saveBtn) {
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const descInput = document.getElementById('deskripsi');
            const nomInput = document.getElementById('nominal');
            const tipeInput = document.getElementById('tipe');
            
            const activeChip = document.querySelector('.chip-btn.active');
            let kat = "Lainnya";
            if (activeChip) {
                kat = activeChip.textContent;
            } else {
                const hiddenKat = document.getElementById('kategori');
                if (hiddenKat && hiddenKat.value) kat = hiddenKat.value;
            }
            
            const desc = descInput.value.trim() || 'Tanpa Keterangan';
            let rawNom = nomInput.value.replace(/\D/g, ''); 
            const nom = Number(rawNom);
            const tipe = tipeInput ? tipeInput.value : 'pengeluaran';
            
            if (isNaN(nom) || nom <= 0) {
                alert("Nominal tidak valid!");
                return;
            }

            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            saveBtn.disabled = true;

            const { error } = await supabase.from('transactions').insert([{
                deskripsi: desc,
                nominal: nom,
                tipe: tipe,
                kategori: kat
            }]);

            saveBtn.innerHTML = 'Simpan Transaksi';
            saveBtn.disabled = false;

            if (error) {
                alert('Gagal menyimpan transaksi: ' + error.message);
                return;
            }
            
            await fetchAndRender();
            
            // Reset state
            descInput.value = "";
            nomInput.value = "0";
            if (typeof window.numpadValue !== 'undefined') window.numpadValue = '0';
            if (typeof window.updateAmountDisplay === 'function') window.updateAmountDisplay();
            
            // Close Modal
            if (typeof closeTransactionModal === 'function') closeTransactionModal();
        });
    }

    // Initial Load
    await fetchAndRender();
});

// === GLOBAL ADVANCED HISTORY FILTER LOGIC (V2) ===
window.filterHistoryList = () => {
    const queryEl = document.getElementById('searchKeterangan');
    const waktuEl = document.getElementById('filterWaktu');
    const kategoriEl = document.getElementById('filterKategori');
    
    if(!queryEl || !waktuEl || !kategoriEl) return;

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
    
    // Gunakan window.transactions agar terjamin data terbarunya terbaca
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
        listBody.innerHTML = '<div style="text-align:center; padding: 32px; color: #6b7280; font-size: 14px;">Tidak ada transaksi yang cocok.</div>';
        return;
    }

    const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    });

    filtered.forEach(t => {
        const tr = document.createElement('div');
        tr.style.display = 'flex';
        tr.style.alignItems = 'center';
        tr.style.padding = '16px';
        tr.style.background = '#FFFFFF';
        tr.style.borderRadius = '16px';
        tr.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        tr.style.marginBottom = '12px';
        tr.style.position = 'relative';

        const iconWrapper = document.createElement('div');
        const tipeIcon = String(t.tipe).toLowerCase();
        iconWrapper.innerHTML = tipeIcon === 'pemasukan' 
            ? '<i class="fa-solid fa-arrow-down" style="color: #10B981"></i>' 
            : '<i class="fa-solid fa-arrow-up" style="color: #EF4444"></i>';
        iconWrapper.style.width = '40px';
        iconWrapper.style.height = '40px';
        iconWrapper.style.borderRadius = '50%';
        iconWrapper.style.background = tipeIcon === 'pemasukan' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        iconWrapper.style.display = 'flex';
        iconWrapper.style.alignItems = 'center';
        iconWrapper.style.justifyContent = 'center';
        iconWrapper.style.marginRight = '12px';
        
        const detailsWrapper = document.createElement('div');
        detailsWrapper.style.flex = '1';
        
        const tdDesc = document.createElement('div');
        tdDesc.textContent = t.deskripsi;
        tdDesc.style.fontWeight = '600';
        tdDesc.style.fontSize = '14px';
        tdDesc.style.color = '#1A1A1A';
        
        const txDate = new Date(t.created_at);
        const formattedDate = txDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const tdDetails = document.createElement('div');
        tdDetails.textContent = `${t.kategori || 'Lainnya'} • ${formattedDate} ${formattedTime}`;
        tdDetails.style.fontSize = '11px';
        tdDetails.style.color = '#6B7280';
        tdDetails.style.marginTop = '2px';
        
        detailsWrapper.append(tdDesc, tdDetails);

        const tdNom = document.createElement('div');
        tdNom.textContent = formatter.format(t.nominal);
        tdNom.style.fontWeight = '700';
        tdNom.style.fontSize = '15px';
        tdNom.style.color = tipeIcon === 'pemasukan' ? '#10B981' : '#EF4444';
        tdNom.style.marginRight = '12px';

        const tdAction = document.createElement('div');
        const btnDelete = document.createElement('button');
        btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btnDelete.className = 'btn-delete';
        btnDelete.style.background = 'rgba(239, 68, 68, 0.1)';
        btnDelete.style.color = '#EF4444';
        btnDelete.style.border = 'none';
        btnDelete.style.width = '32px';
        btnDelete.style.height = '32px';
        btnDelete.style.borderRadius = '50%';
        btnDelete.style.cursor = 'pointer';
        btnDelete.style.display = 'flex';
        btnDelete.style.alignItems = 'center';
        btnDelete.style.justifyContent = 'center';
        
        btnDelete.addEventListener('click', async () => {
            const confirmDel = confirm(`Apakah Anda yakin ingin menghapus transaksi "${t.deskripsi}"?`);
            if (!confirmDel) return;
            
            const { error } = await window.supabaseClient.from('transactions').delete().eq('id', t.id);
            if (error) {
                alert('Gagal menghapus: ' + error.message);
                return;
            }
            await window.fetchAndRenderGlobal();
        });
        tdAction.appendChild(btnDelete);

        tr.append(iconWrapper, detailsWrapper, tdNom, tdAction);
        listBody.appendChild(tr);
    });
};

// === GLOBAL EXPORT & RESET HANDLERS ===
window.exportToCSV = () => {
    if (!window.transactions || window.transactions.length === 0) {
        alert("Tidak ada transaksi untuk diekspor!");
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Tanggal,Deskripsi,Kategori,Nominal,Tipe\n";
    window.transactions.forEach(t => {
        const row = `"${t.id}","${t.created_at}","${t.deskripsi}","${t.kategori || ''}",${t.nominal},"${t.tipe}"`;
        csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Money_Tracker_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.dangerResetDatabase = async () => {
    const confirmFirst = confirm("Apakah Anda yakin ingin menghapus SELURUH transaksi? Tindakan ini permanen!");
    if (!confirmFirst) return;
    const confirmSecond = prompt("Ketik 'HAPUS' untuk mengonfirmasi:");
    if (confirmSecond !== "HAPUS") {
        alert("Konfirmasi gagal. Reset dibatalkan.");
        return;
    }
    const { error } = await window.supabaseClient.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        alert("Gagal mereset database: " + error.message);
    } else {
        alert("Database transaksi berhasil dibersihkan!");
        await window.fetchAndRenderGlobal();
    }
};
