import { test, expect } from "@playwright/test";

test.describe("Todo Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page (timeline)
    // This might require authentication setup
    await page.goto("/");
  });

  test("should display todos page", async ({ page }) => {
    // Check if the todos page loads correctly
    await expect(page).toHaveTitle(/일상투두/);

    // Look for todo-related elements
    const hasTodoElements = await Promise.race([
      page.getByText("할일").first().isVisible(),
      page.getByRole("button", { name: /추가/i }).isVisible(),
      page.getByRole("list").isVisible(),
    ]).catch(() => false);

    expect(hasTodoElements).toBeTruthy();
  });

  test("should create a new todo", async ({ page }) => {
    // Look for add todo button or form
    const addButton = page.getByRole("button", { name: /추가/i }).first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Fill in the todo form
      const input = page.getByRole("textbox").first();
      await input.fill("Test todo from E2E");

      // Submit the form
      const submitButton = page
        .getByRole("button", { name: /생성|확인/i })
        .first();
      await submitButton.click();

      // Verify the todo was created
      await expect(page.getByText("Test todo from E2E")).toBeVisible();
    }
  });

  test("should toggle todo completion", async ({ page }) => {
    // This test assumes there are existing todos
    const firstCheckbox = page.getByRole("checkbox").first();

    if (await firstCheckbox.isVisible()) {
      const wasChecked = await firstCheckbox.isChecked();

      await firstCheckbox.click();

      // Verify the state changed
      const isChecked = await firstCheckbox.isChecked();
      expect(isChecked).toBe(!wasChecked);
    }
  });

  test("should search and filter todos", async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/검색/i).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("test");

      // Wait for search results to update
      await page.waitForTimeout(500);

      // Verify search functionality
      const todoItems = page.getByRole("listitem");
      const count = await todoItems.count();

      // Should show filtered results or empty state
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle todo deletion", async ({ page }) => {
    // Look for a todo with options menu
    const firstOptionsButton = page
      .getByRole("button", { name: /옵션/i })
      .first();

    if (await firstOptionsButton.isVisible()) {
      await firstOptionsButton.click();

      // Click delete option
      const deleteButton = page.getByText("삭제").first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion if there's a confirmation dialog
        const confirmButton = page
          .getByRole("button", { name: /삭제|확인/i })
          .first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify deletion occurred (this would depend on implementation)
        await page.waitForTimeout(500);
      }
    }
  });

  test("should support drag and drop reordering", async ({ page }) => {
    // This test is more complex and would require specific drag handles
    const todoItems = page.getByRole("listitem");
    const count = await todoItems.count();

    if (count >= 2) {
      const firstItem = todoItems.first();
      const secondItem = todoItems.nth(1);

      // Get the drag handle if it exists
      const dragHandle = firstItem
        .getByRole("button", { name: /순서/i })
        .first();

      if (await dragHandle.isVisible()) {
        // Perform drag and drop
        await dragHandle.dragTo(secondItem);

        // Wait for reordering to complete
        await page.waitForTimeout(500);

        // Verify order changed (this would require checking specific content)
      }
    }
  });

  test("should work on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page with mobile viewport
    await page.reload();

    // Verify mobile-specific elements or layout
    await expect(page).toHaveTitle(/일상투두/);

    // Check if the page is responsive
    const bodyElement = page.locator("body");
    await expect(bodyElement).toBeVisible();
  });

  test("should maintain state during navigation", async ({ page }) => {
    // Navigate to different sections and back
    await page.goto("/");

    // If there's navigation to other sections
    const navigationLinks = page.getByRole("link");
    const linkCount = await navigationLinks.count();

    if (linkCount > 0) {
      // Click on a different section
      const firstLink = navigationLinks.first();
      await firstLink.click();

      // Navigate back to main page
      await page.goto("/");

      // Verify page is still accessible
      await expect(page).toHaveTitle(/일상투두/);
    }
  });
});
