import re

with open('style.css', 'r') as f:
    content = f.read()

# BONGKAR NAVIGASI BAWAH (FAB)
fab_css = """
/* --- BOTTOM NAVIGATION & FAB --- */
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--card-bg);
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 12px 0 16px 0;
    border-top: 1px solid var(--border-color);
    z-index: 900;
    padding-bottom: env(safe-area-inset-bottom, 16px);
}

.bottom-nav .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--text-muted);
    font-size: 12px;
    text-decoration: none;
    cursor: pointer;
    flex: 1;
    transition: color 0.2s ease;
}

.bottom-nav .nav-item i {
    font-size: 20px;
    margin-bottom: 4px;
}

.bottom-nav .nav-item.active {
    color: var(--primary-color);
}

.fab-wrapper {
    position: relative;
    top: -24px;
    flex: 0 0 60px;
    display: flex;
    justify-content: center;
    z-index: 1000;
}

.fab-main-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: var(--primary-color);
    color: white;
    border: none;
    font-size: 24px;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s ease;
}

.fab-main-btn:active {
    transform: scale(0.95);
}
"""

nav_pattern = r'\.bottom-nav\s*\{.*?\}(?:\s*\.bottom-nav\s+\.nav-item.*?\{.*?\})*(?:\s*\.bottom-nav\s+\.nav-item\s+i\s*\{.*?\})*(?:\s*\.bottom-nav\s+\.nav-item\.active\s*\{.*?\})*(?:\s*\.fab-container\s*\{.*?\})*(?:\s*\.fab-btn\s*\{.*?\})*'
content = re.sub(nav_pattern, '', content, flags=re.DOTALL)
content += "\n" + fab_css

bottom_sheet_pattern = r'\.modal-content\.bottom-sheet\s*\{[^}]*\}'
new_bottom_sheet = """.modal-content.bottom-sheet {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    transform: translateY(100%);
    display: flex;
    flex-direction: column;
}"""
content = re.sub(bottom_sheet_pattern, new_bottom_sheet, content, flags=re.DOTALL)

numpad_container_pattern = r'\.numpad-container\s*\{[^}]*\}'
new_numpad_container = """.numpad-container {
    background-color: var(--bg-color);
    padding: 10px 10px 20px 10px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border-color);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: auto;
}"""
content = re.sub(numpad_container_pattern, new_numpad_container, content, flags=re.DOTALL)

scrollable_middle_pattern = r'\.scrollable-middle\s*\{[^}]*\}'
new_scrollable_middle = """.scrollable-middle {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    padding-bottom: 20px;
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.scrollable-middle::-webkit-scrollbar {
    display: none;
}"""
content = re.sub(scrollable_middle_pattern, new_scrollable_middle, content, flags=re.DOTALL)

loading_state_css = """
.loading-state {
    text-align: center;
    padding: 20px;
    color: var(--text-muted);
    font-size: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
}
"""
content += "\n" + loading_state_css

with open('style.css', 'w') as f:
    f.write(content)
print("style.css updated")
