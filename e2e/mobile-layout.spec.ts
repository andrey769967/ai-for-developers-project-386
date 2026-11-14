import { test, expect } from "@playwright/test";

// На телефоне календарь и список времени должны идти друг под другом,
// иначе колонка времени сжимается и уходит за край экрана.
test("на ширине 375 px календарь и время стоят друг под другом", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await page.getByRole("button", { name: /Консультация/ }).click();

  const datesHeader = page.getByText("Даты", { exact: true });
  const timeHeader = page.getByText("Время", { exact: true });

  await expect(datesHeader).toBeVisible();
  await expect(timeHeader).toBeVisible();

  const datesBox = await datesHeader.boundingBox();
  const timeBox = await timeHeader.boundingBox();

  expect(datesBox).not.toBeNull();
  expect(timeBox).not.toBeNull();
  expect(timeBox!.y).toBeGreaterThan(datesBox!.y + datesBox!.height);
});
