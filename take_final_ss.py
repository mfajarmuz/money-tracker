
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Buka URL web server lokal kita
        await page.goto('http://127.0.0.1:8090')
        await page.set_viewport_size({"width": 390, "height": 844}) # Simulasi iPhone 12/13
        # Beri jeda sedikit agar JS selesai me-render
        await page.wait_for_timeout(1000)
        await page.screenshot(path='/home/fajar/workspace/money-tracker/final_mobile_view.png')
        await browser.close()
        print("Screenshots taken")

asyncio.run(main())
