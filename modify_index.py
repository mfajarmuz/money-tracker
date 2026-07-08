import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. BONGKAR NAVIGASI BAWAH
# Kita ubah <nav class="bottom-nav"> isinya.
nav_pattern = r'<nav class="bottom-nav">.*?</nav>'
new_nav = """<nav class="bottom-nav">
            <div class="nav-item active" data-target="dashboard">
                <i class="fa-solid fa-house"></i>
                <span>Home</span>
            </div>
            
            <!-- FAB Container (+) Floating di tengah -->
            <div class="fab-wrapper" onclick="openTransactionModal()">
                <button class="fab-main-btn" aria-label="Tambah Transaksi">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>

            <div class="nav-item" data-target="laporan">
                <i class="fa-solid fa-chart-pie"></i>
                <span>Report</span>
            </div>

            <div class="nav-item" data-target="pengaturan">
                <i class="fa-solid fa-gear"></i>
                <span>Settings</span>
            </div>
        </nav>"""
content = re.sub(nav_pattern, new_nav, content, flags=re.DOTALL)

# 2. Loading state pada Data Supabase (di list transaksi)
# Kita taruh skeleton loading di dalam #historyTableBody 
list_pattern = r'<div class="transaction-list" id="historyTableBody">.*?</div>'
new_list = """<div class="transaction-list" id="historyTableBody">
                            <div id="loadingState" class="loading-state">
                                <i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...
                            </div>
                        </div>"""
content = re.sub(list_pattern, new_list, content, flags=re.DOTALL)

with open('index.html', 'w') as f:
    f.write(content)
print("index.html updated")
