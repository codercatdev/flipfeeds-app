
from playwright.sync_api import Page, expect, sync_playwright
import time

def test_landing_page(page: Page):
    """
    Verifies that the landing page loads and the app is running.
    """
    # 1. Go to the landing page
    page.goto("http://localhost:3000")

    # 2. Expect the title or main heading to be visible
    # Based on page.tsx, there is a header "FlipFeeds"
    expect(page.get_by_role("heading", name="FlipFeeds", level=1)).to_be_visible()

    # 3. Take a screenshot of the landing page
    page.screenshot(path="/home/jules/verification/landing_page.png")

    # 4. Try to navigate to /feeds (should redirect to /signin)
    page.goto("http://localhost:3000/feeds")

    # 5. Wait for redirect logic
    page.wait_for_url("**/signin**")

    # 6. Take a screenshot of the signin page (redirect success)
    page.screenshot(path="/home/jules/verification/signin_redirect.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Launch with webgl enabled just in case, though headless
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_landing_page(page)
            print("Verification script completed successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
