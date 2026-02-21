import { test, expect } from '@playwright/test';

test.describe('Task Board Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kanban');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays task board layout when backend is reachable', async ({ page }) => {
    const taskBoard = page.getByTestId('task-board');
    await expect(taskBoard).toBeVisible();

    await expect(page.getByTestId('status-column-pending')).toBeVisible();
    await expect(page.getByTestId('status-column-in_progress')).toBeVisible();
    await expect(page.getByTestId('status-column-completed')).toBeVisible();

    await expect(page.getByTestId('add-task-button')).toBeVisible();
  });

  test('creates a new task and shows it on the board', async ({ page }) => {
    const uniqueTask = `E2E Task ${Date.now()}`;

    await page.getByTestId('add-task-button').click();
    const taskForm = page.getByTestId('task-form');
    await expect(taskForm).toBeVisible();

    await page.getByTestId('task-content-input').fill(uniqueTask);
    await page.getByTestId('priority-select').selectOption('high');
    await page.getByTestId('status-select').selectOption('pending');
    await page.getByTestId('task-form-submit').click();

    await expect(taskForm).not.toBeVisible();

    const pendingColumn = page.getByTestId('status-column-pending');
    await expect(pendingColumn.getByText(uniqueTask)).toBeVisible();
  });
});
