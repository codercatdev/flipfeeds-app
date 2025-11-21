from playwright.sync_api import sync_playwright
import json
import base64
import time

def create_fake_token():
    header = {"alg": "none", "typ": "JWT"}
    payload = {
        "sub": "test-user-123",
        "user_id": "test-user-123",
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150"
    }
    def b64e(data):
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")
    return f"{b64e(header)}.{b64e(payload)}."

def test_feed_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Set fake auth cookie
        token = create_fake_token()
        context.add_cookies([{
            "name": "__session",
            "value": token,
            "domain": "localhost",
            "path": "/"
        }])

        print("Navigating to feeds...")
        page = context.new_page()
        page.goto("http://localhost:3000/feeds")

        # Wait for load
        try:
            # Check for specific text from new layout
            page.wait_for_load_state("networkidle", timeout=10000)
            print("Page loaded.")
        except:
            print("Timeout waiting for networkidle.")

        # Take screenshots
        page.set_viewport_size({"width": 375, "height": 812})
        time.sleep(2)
        page.screenshot(path="/tmp/mobile_feed.png")
        print("Mobile screenshot saved to /tmp/mobile_feed.png")

        page.set_viewport_size({"width": 1440, "height": 900})
        time.sleep(2)
        page.screenshot(path="/tmp/desktop_feed.png")
        print("Desktop screenshot saved to /tmp/desktop_feed.png")

        browser.close()

if __name__ == "__main__":
    test_feed_layout()
