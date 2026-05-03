import { test, expect } from "@playwright/test";

test.describe("AI HQ", () => {
  test("should load the office page", async ({ page }) => {
    await page.goto("/office");
    
    // Check main elements are visible
    await expect(page.locator("text=AI·HQ")).toBeVisible();
    await expect(page.locator("text=Офис")).toBeVisible();
    await expect(page.locator("text=Доброе утро")).toBeVisible();
  });

  test("should display projects", async ({ page }) => {
    await page.goto("/office");
    
    // Check projects section
    await expect(page.locator("text=Текущие проекты")).toBeVisible();
    await expect(page.locator("text=Крипто-Компас")).toBeVisible();
  });

  test("should navigate to projects page", async ({ page }) => {
    await page.goto("/office");
    
    // Click on projects link
    await page.click('text=Проекты');
    
    // Check URL
    await expect(page).toHaveURL(/\/projects/);
  });

  test("should have working chat composer", async ({ page }) => {
    await page.goto("/office");
    
    // Type in chat
    await page.fill('textarea[placeholder*="Опишите задачу"]', "Тестовое сообщение");
    
    // Send button should be visible
    await expect(page.locator("button[title='Отправить']")).toBeVisible();
  });
});
