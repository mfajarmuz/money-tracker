import re

with open('/home/fajar/workspace/money-tracker/app.js', 'r') as f:
    content = f.read()

# 1. Loading State Supabase
fetch_pattern = r'(async function fetchAndRender\(\)\s*\{)(.*?)(const \{ data, error \} = await supabaseClient)'

def add_loading_state(match):
    return f"""{match.group(1)}
    const tbody = document.getElementById('historyTableBody');
    if (tbody) {{
        tbody.innerHTML = '<div id="loadingState" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...</div>';
    }}{match.group(2)}{match.group(3)}"""

content = re.sub(fetch_pattern, add_loading_state, content, flags=re.DOTALL)

with open('/home/fajar/workspace/money-tracker/app.js', 'w') as f:
    f.write(content)
print("app.js updated")
