import { expect, test, type Page } from "@playwright/test";

/*
 * Public website. These tests only read pages. They submit no form and send no message. They run against the
 * production build, which the Playwright config starts on the disposable test database.
 */

const PUBLIC_ROUTES = ["/", "/about", "/packages", "/vehicles", "/cash-discount", "/contact", "/signup", "/login"];

/** Every same-site link on a page, without fragments. Used to find dead links. */
async function internalLinks(page: Page): Promise<string[]> {
  const hrefs = await page.$$eval("a[href]", (anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
  const paths = hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//")).map((href) => href.split("#")[0]);
  return [...new Set(paths.filter((path) => path.length > 0))];
}

test.describe("public routes render", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders one heading and the site title`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/Riyona|Riyona Driving School/);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  }
});

test("the home page and sign-in page keep their existing behaviour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply now" }).first()).toBeVisible();

  await page.goto("/login?role=student");
  await expect(page.getByPlaceholder("Enter student ID")).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("navigation links on a public page lead to pages that exist", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  const navigation = page.getByRole("list", { name: "Main" });
  for (const label of ["Home", "About", "Packages", "Vehicles", "Cash discount", "Contact"]) {
    await expect(navigation.getByRole("link", { name: label })).toHaveAttribute("href", /^\/($|[a-z-]+$)/);
  }
  await navigation.getByRole("link", { name: "Packages" }).click();
  await expect(page).toHaveURL(/\/packages$/);
});

test("the current page is marked in the navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/packages");
  await expect(page.getByRole("list", { name: "Main" }).getByRole("link", { name: "Packages" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("list", { name: "Main" }).getByRole("link", { name: "Vehicles" })).not.toHaveAttribute("aria-current", "page");
});

test("the mobile menu opens and leads to a page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("summary", { hasText: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Vehicles" }).click();
  await expect(page).toHaveURL(/\/vehicles$/);
});

for (const route of ["/", "/about", "/packages", "/vehicles", "/cash-discount", "/contact"]) {
  test(`${route} has no dead internal links`, async ({ page }) => {
    await page.goto(route);
    for (const path of await internalLinks(page)) {
      const response = await page.request.get(path);
      expect(response.status(), `link to ${path} from ${route}`).toBeLessThan(400);
    }
  });
}

test("packages show the price list's figures with unambiguous units", async ({ page }) => {
  await page.goto("/packages");
  await expect(page.getByText("LKR 26,000").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Car Daily Training", exact: true })).toBeVisible();
  await expect(page.getByText("LKR 2,000 per session").first()).toBeVisible();
  await expect(page.getByText("per 30-minute session").first()).toBeVisible();
});

test("a fixed-fee package leads to the existing application, and a per-session rate to the school", async ({ page }) => {
  await page.goto("/packages");
  await page.getByRole("link", { name: "Apply for this package" }).first().click();
  await expect(page).toHaveURL(/\/signup$/);

  await page.goto("/packages#daily-rates");
  await page.getByRole("link", { name: "Contact the school about this rate" }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
});

test("the vehicle categories show daily rates only where the price list has one", async ({ page }) => {
  await page.goto("/vehicles");
  for (const heading of ["Car Lessons (Auto & Manual)", "Van Lessons", "Motorbike Lessons (A/L)", "Three-Wheeler Lessons"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText("LKR 1,000 per session")).toBeVisible();
  await expect(page.getByText("LKR 1,500 per session")).toBeVisible();
});

test("the cash discount page states the policy without calculating a discounted price", async ({ page }) => {
  await page.goto("/cash-discount");
  await expect(page.getByText("5% discount when the full eligible package fee is paid in cash at once.")).toBeVisible();
  await expect(page.getByText("Ask the school to confirm the final amount in writing")).toBeVisible();
});

test("the contact page shows only the verified contact channels", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("main").getByRole("link", { name: "+94 71 889 4481" })).toHaveAttribute("href", "tel:+94718894481");
  await expect(page.getByRole("main").getByRole("link", { name: "Message us on WhatsApp" })).toHaveAttribute("href", "https://wa.me/94718894481");
  await expect(page.getByRole("main").getByText("Pitipana Junction, Homagama, Sri Lanka")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
});

test("public pages do not overflow horizontally at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/about", "/packages", "/vehicles", "/cash-discount", "/contact"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);
  }
});

test("public pages show no portal content to visitors who are not signed in", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByText("Instructor Portal")).toHaveCount(0);
  await expect(page.getByText("Student portal")).toHaveCount(0);

  await page.goto("/portal/student");
  await expect(page).toHaveURL(/\/login\?role=student/);
});
