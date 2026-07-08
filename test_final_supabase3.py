import asyncio
from playwright.async_api import async_playwright

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        # Gunakan viewport besar agar tidak tersembunyi
        await page.set_viewport_size({"width": 390, "height": 1200})
        await page.goto("http://127.0.0.1:8090")
        await page.wait_for_timeout(2000)
        
        # Buka modal
        await page.click(".fab-btn")
        await page.wait_for_timeout(500)
        
        # Ketik 50000 menggunakan browser evaluate (karena tombol numpad absolute diluar viewport browser headless)
        print("Evaluating numpadPress via browser js...")
        await page.evaluate("numpadPress('5')")
        await page.evaluate("numpadPress('0')")
        await page.evaluate("numpadPress('0')")
        await page.evaluate("numpadPress('0')")
        await page.evaluate("numpadPress('0')")
        
        # Ketik Keterangan
        await page.fill("#deskripsi", "Test Beli Kopi")
        
        # Klik Simpan
        await page.click("#saveTransactionBtn")
        await page.wait_for_timeout(3000)
        
        print("--- CONSOLE ERRORS ON SAVE ---")
        if not console_errors:
            print("No errors! Transaksi sukses tersimpan.")
        for err in console_errors:
            print(f"Error: {err}")
            
        await browser.close()

asyncio.run(run_test())
