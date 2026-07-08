document.addEventListener('DOMContentLoaded', () => {
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
            document.getElementById(targetId).classList.add('active');
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
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let categories = JSON.parse(localStorage.getItem('categories')) || ["Gaji", "Makan", "Transport", "Lainnya"];
    let chartInstance = null;
    
    const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    });

    function updateUI() {
        renderCategories();
        // Render Table (XSS Safe via createElement)
        tableBody.innerHTML = '';
        
        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        
        transactions.forEach((t, index) => {
            if (t.tipe === 'pemasukan') totalPemasukan += t.nominal;
            else totalPengeluaran += t.nominal;
            
            const tr = document.createElement('div'); // Ubah tr ke div agar sesuai style list
            tr.setAttribute('data-tipe', t.tipe);
            tr.style.display = 'flex';
            tr.style.position = 'relative';
            tr.style.padding = '16px';
            tr.style.background = 'var(--clr-white)';
            tr.style.borderRadius = 'var(--radius-md)';
            tr.style.boxShadow = 'var(--shadow-sm)';
            tr.style.flexWrap = 'wrap';
            
            // Keterangan & Deskripsi (Col 1)
            const iconWrapper = document.createElement('div');
            iconWrapper.innerHTML = t.tipe === 'pemasukan' 
                ? '<i class="fa-solid fa-arrow-down" style="color: var(--clr-income)"></i>' 
                : '<i class="fa-solid fa-arrow-up" style="color: var(--clr-expense)"></i>';
            iconWrapper.style.width = '40px';
            iconWrapper.style.height = '40px';
            iconWrapper.style.borderRadius = '50%';
            iconWrapper.style.background = t.tipe === 'pemasukan' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            iconWrapper.style.display = 'flex';
            iconWrapper.style.alignItems = 'center';
            iconWrapper.style.justifyContent = 'center';
            iconWrapper.style.marginRight = '12px';
            iconWrapper.style.order = '1';

            const tdDesc = document.createElement('div');
            tdDesc.textContent = t.deskripsi;
            tdDesc.style.fontWeight = '600';
            tdDesc.style.fontSize = '15px';
            tdDesc.style.order = '2';
            tdDesc.style.flex = '1';
            tdDesc.style.marginBottom = '20px';
            
            // Kategori (Col 2)
            const tdCat = document.createElement('div');
            tdCat.textContent = t.kategori || '-';
            tdCat.style.position = 'absolute';
            tdCat.style.bottom = '16px';
            tdCat.style.left = '64px';
            tdCat.style.fontSize = '12px';
            tdCat.style.color = 'var(--clr-text-muted)';
            tdCat.style.order = '3';
            
            // Nominal (Col 3)
            const tdNom = document.createElement('div');
            tdNom.textContent = formatter.format(t.nominal);
            tdNom.style.order = '4';
            tdNom.style.fontWeight = '600';
            tdNom.style.fontSize = '16px';
            tdNom.style.textAlign = 'right';
            
            // Tipe (Col 4)
            const tdType = document.createElement('div');
            tdType.style.display = 'none'; // Sembunyikan, pakai style CSS based on data-tipe
            
            // Aksi (Col 5)
            const tdAction = document.createElement('div');
            tdAction.style.order = '5';
            tdAction.style.marginLeft = '12px';

            const btnDelete = document.createElement('button');
            btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btnDelete.className = 'btn-delete';
            btnDelete.style.background = 'rgba(239, 68, 68, 0.1)';
            btnDelete.style.color = 'var(--clr-expense)';
            btnDelete.style.border = 'none';
            btnDelete.style.width = '32px';
            btnDelete.style.height = '32px';
            btnDelete.style.borderRadius = '50%';
            btnDelete.style.cursor = 'pointer';
            btnDelete.style.display = 'flex';
            btnDelete.style.alignItems = 'center';
            btnDelete.style.justifyContent = 'center';
            
            btnDelete.addEventListener('click', () => {
                transactions.splice(index, 1);
                saveAndRender();
            });
            tdAction.appendChild(btnDelete);
            
            tr.append(iconWrapper, tdDesc, tdCat, tdNom, tdType, tdAction);
            tableBody.appendChild(tr);
        });
        
        // Update Dashboard Balance
        const totalSaldo = totalPemasukan - totalPengeluaran;
        totalSaldoEl.textContent = formatter.format(totalSaldo);
        
        // Update Report Summaries
        sumPemasukanEl.textContent = formatter.format(totalPemasukan);
        sumPengeluaranEl.textContent = formatter.format(totalPengeluaran);
        sumTransaksiEl.textContent = transactions.length;
        
        updateChart(totalPemasukan, totalPengeluaran);
    }
    
    function updateChart(pemasukan, pengeluaran) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        if (pemasukan === 0 && pengeluaran === 0) {
            return;
        }

        chartInstance = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Pemasukan', 'Pengeluaran'],
                datasets: [{
                    data: [pemasukan, pengeluaran],
                    backgroundColor: ['#10b981', '#ef4444'], // Green, Red
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
                                size: 14
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
                btn.textContent = cat;
                btn.onclick = () => {
                    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if(katSelect) katSelect.value = cat;
                };
                chipsContainer.appendChild(btn);

                if(katSelect) {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    if(index === 0) opt.selected = true;
                    katSelect.appendChild(opt);
                }
            });
        }

        // Update table in Settings view
        categoryTableBody.innerHTML = '';
        categories.forEach((cat, index) => {
            const tr = document.createElement('tr');
            
            const tdName = document.createElement('td');
            tdName.textContent = cat;
            tdName.setAttribute('data-label', 'Nama Kategori');
            
            const tdAction = document.createElement('td');


            const btnDelete = document.createElement('button');
            btnDelete.textContent = 'Hapus';
            btnDelete.className = 'btn-delete';
            btnDelete.addEventListener('click', () => {
                const isUsed = transactions.some(t => t.kategori === cat);
                if (isUsed) {
                    alert(`Kategori "${cat}" tidak bisa dihapus karena sedang digunakan dalam transaksi.`);
                    return;
                }
                categories.splice(index, 1);
                saveAndRender();
            });
            tdAction.appendChild(btnDelete);
            
            tr.append(tdName, tdAction);
            categoryTableBody.appendChild(tr);
        });
    }
    
    function saveAndRender() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('categories', JSON.stringify(categories));
        updateUI();
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const descInput = document.getElementById('deskripsi');
        const nomInput = document.getElementById('nominal');
        const tipeInput = document.getElementById('tipe');
        const katInput = document.getElementById('kategori');
        
        const desc = descInput.value.trim();
        const nom = Number(nomInput.value);
        const tipe = tipeInput.value;
        const kat = katInput.value;
        
        if (!desc || isNaN(nom) || nom <= 0) return;
        
        transactions.push({
            deskripsi: desc,
            nominal: nom,
            tipe: tipe,
            kategori: kat
        });
        
        form.reset();
        
        // Ensure UI stays in sync for Numpad
        if (typeof numpadValue !== 'undefined') {
            numpadValue = "0";
            if(typeof updateAmountDisplay === 'function') {
                updateAmountDisplay();
            }
        }
        
        if(typeof closeTransactionModal === 'function') {
            closeTransactionModal();
        }

        descInput.focus();
        saveAndRender();
    });
    
    
    // Format nominal input dengan separator titik
    const nomInput = document.getElementById('nominal');
    if (nomInput) {
        nomInput.addEventListener('keyup', function(e) {
            // Hapus karakter selain angka
            let val = this.value.replace(/[^\d]/g, '');
            // Format ulang dengan titik pemisah ribuan
            this.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        });
    }

    if(categoryForm) {
        categoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const katInput = document.getElementById('namaKategori');
            const newCat = katInput.value.trim();
            
            if (!newCat) return;
            if (categories.includes(newCat)) {
                alert('Kategori sudah ada!');
                return;
            }
            
            categories.push(newCat);
            categoryForm.reset();
            katInput.focus();
            saveAndRender();
        });
    }
    
    // Init

    // Perbaikan bug Numpad UI form submission
    const numpadForm = document.getElementById('transactionForm');
    const saveBtn = document.getElementById('saveTransactionBtn');
    
    // Ganti type button agar tidak auto-submit dan re-trigger
    if (saveBtn) {
        saveBtn.type = 'button';
        
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const descInput = document.getElementById('deskripsi');
            const nomInput = document.getElementById('nominal');
            const tipeInput = document.getElementById('tipe'); // Hidden select
            
            // Kategori chip yg aktif (disimpan di hidden select kategori atau ambil yg ada class active)
            const activeChip = document.querySelector('.category-chip.active');
            let kat = "Lainnya"; // Default
            if (activeChip) {
                kat = activeChip.textContent;
            } else {
                const hiddenKat = document.getElementById('kategori');
                if (hiddenKat && hiddenKat.value) kat = hiddenKat.value;
            }
            
            const desc = descInput.value.trim() || 'Tanpa Keterangan';
            // Bersihkan format string numpad ke angka murni (jika ada separator)
            let rawNom = nomInput.value.replace(/\D/g, ''); 
            const nom = Number(rawNom);
            const tipe = tipeInput ? tipeInput.value : 'pengeluaran';
            
            if (isNaN(nom) || nom <= 0) {
                alert("Nominal tidak valid!");
                return;
            }
            
            transactions.push({
                deskripsi: desc,
                nominal: nom,
                tipe: tipe,
                kategori: kat
            });
            
            saveAndRender();
            
            // Reset form Numpad
            descInput.value = "";
            nomInput.value = "0";
            if (typeof numpadValue !== 'undefined') if(typeof window.numpadValue !== 'undefined') window.numpadValue = '0';
            if (typeof updateAmountDisplay === 'function') if(typeof window.updateAmountDisplay === 'function') window.updateAmountDisplay();
            
            // Reset state tombol simpan
            saveBtn.classList.add('disabled');
            saveBtn.disabled = true;
            
            // Tutup Modal
            if (typeof closeTransactionModal === 'function') closeTransactionModal();
        });
    }

    updateUI();
});

