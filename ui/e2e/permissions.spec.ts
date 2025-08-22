import { test, expect } from '@playwright/test';

test.describe('Permission Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/permissions');
    await page.waitForLoadState('networkidle');
  });

  test('should display permissions overview', async ({ page }) => {
    // Given I am logged into CODEGOAT as an admin user
    // And the permission management feature is enabled
    
    // When I navigate to the Permissions page
    // Then I should see the permissions header
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // And I should see user roles section
    await expect(page.locator('[data-testid="user-roles"]')).toBeVisible();
    
    // And I should see resource permissions section
    await expect(page.locator('[data-testid="resource-permissions"]')).toBeVisible();
    
    // And I should see worker access controls
    await expect(page.locator('[data-testid="worker-access-controls"]')).toBeVisible();
    
    // And I should see audit trail section
    await expect(page.locator('[data-testid="permissions-audit"]')).toBeVisible();
  });

  test('should manage user roles', async ({ page }) => {
    // Given I am on the Permissions page
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // When I view the user roles section
    const rolesSection = page.locator('[data-testid="user-roles"]');
    await expect(rolesSection).toBeVisible();
    
    // Then I should see existing user roles
    await expect(page.locator('[data-testid="role-item"]')).toBeVisible();
    
    // When I click "Add New Role"
    const addRoleButton = page.getByRole('button', { name: /add.*role/i });
    if (await addRoleButton.count() > 0) {
      await addRoleButton.click();
      
      // Then I should see the role creation form
      const roleForm = page.locator('[data-testid="role-creation-form"]');
      await expect(roleForm).toBeVisible();
      
      // When I fill in role details
      await page.locator('[data-testid="role-name"]').fill('Developer');
      await page.locator('[data-testid="role-description"]').fill('Can create and manage tasks');
      
      // And I select permissions for the role
      await page.locator('[data-testid="permission-create-tasks"]').check();
      await page.locator('[data-testid="permission-view-workers"]').check();
      await page.locator('[data-testid="permission-run-validations"]').check();
      
      // And I click "Create Role"
      await page.getByRole('button', { name: /create role/i }).click();
      
      // Then the role should be created
      await expect(page.locator('[data-testid="role-created"]')).toBeVisible();
      
      // And I should see the new role in the list
      await expect(page.locator('[data-testid="role-item"]')).toContainText('Developer');
    }
  });

  test('should configure resource permissions', async ({ page }) => {
    // Given I am on the Permissions page
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // When I view the resource permissions section
    const resourceSection = page.locator('[data-testid="resource-permissions"]');
    await expect(resourceSection).toBeVisible();
    
    // Then I should see different resource categories
    await expect(page.locator('[data-testid="tasks-permissions"]')).toBeVisible();
    await expect(page.locator('[data-testid="workers-permissions"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-permissions"]')).toBeVisible();
    await expect(page.locator('[data-testid="settings-permissions"]')).toBeVisible();
    
    // When I configure task permissions
    const tasksPermissions = page.locator('[data-testid="tasks-permissions"]');
    
    // And I set "Create Tasks" to "Developer" role
    const createTasksSelect = tasksPermissions.locator('[data-testid="create-tasks-role"]');
    await createTasksSelect.selectOption('Developer');
    
    // And I set "Delete Tasks" to "Admin" role
    const deleteTasksSelect = tasksPermissions.locator('[data-testid="delete-tasks-role"]');
    await deleteTasksSelect.selectOption('Admin');
    
    // And I click "Save Permissions"
    await page.getByRole('button', { name: /save permissions/i }).click();
    
    // Then the permissions should be updated
    await expect(page.locator('[data-testid="permissions-saved"]')).toBeVisible();
  });

  test('should manage worker access controls', async ({ page }) => {
    // Given I am on the Permissions page
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // When I view the worker access controls section
    const workerSection = page.locator('[data-testid="worker-access-controls"]');
    await expect(workerSection).toBeVisible();
    
    // Then I should see worker execution limits
    await expect(page.locator('[data-testid="worker-execution-limits"]')).toBeVisible();
    
    // And I should see allowed command configurations
    await expect(page.locator('[data-testid="allowed-commands-config"]')).toBeVisible();
    
    // When I configure execution limits by role
    const executionLimits = page.locator('[data-testid="worker-execution-limits"]');
    
    // Set concurrent workers limit for Developer role
    await executionLimits.locator('[data-testid="developer-concurrent-limit"]').fill('2');
    
    // Set execution timeout for Developer role
    await executionLimits.locator('[data-testid="developer-timeout-limit"]').fill('20');
    
    // Enable directory restrictions for Developer role
    const dirRestrictionsToggle = executionLimits.locator('[data-testid="developer-dir-restrictions"]');
    if (!await dirRestrictionsToggle.isChecked()) {
      await dirRestrictionsToggle.click();
    }
    
    // And I click "Save Access Controls"
    await page.getByRole('button', { name: /save.*access.*controls/i }).click();
    
    // Then the access controls should be updated
    await expect(page.locator('[data-testid="access-controls-saved"]')).toBeVisible();
  });

  test('should assign users to roles', async ({ page }) => {
    // Given I am on the Permissions page
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // When I click "Manage User Assignments"
    const manageUsersButton = page.getByRole('button', { name: /manage.*user.*assignments/i });
    if (await manageUsersButton.count() > 0) {
      await manageUsersButton.click();
      
      // Then I should see the user assignment dialog
      const assignmentDialog = page.locator('[data-testid="user-assignment-dialog"]');
      await expect(assignmentDialog).toBeVisible();
      
      // And I should see existing user assignments
      await expect(page.locator('[data-testid="user-assignment"]')).toBeVisible();
      
      // When I add a new user assignment
      await page.locator('[data-testid="user-email"]').fill('developer@example.com');
      await page.locator('[data-testid="user-role-select"]').selectOption('Developer');
      
      await page.getByRole('button', { name: /assign role/i }).click();
      
      // Then the user should be assigned to the role
      await expect(page.locator('[data-testid="user-assigned"]')).toBeVisible();
      
      // And I should see the assignment in the list
      await expect(page.locator('[data-testid="user-assignment"]')).toContainText('developer@example.com');
    }
  });

  test('should view permissions audit trail', async ({ page }) => {
    // Given I am on the Permissions page
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // When I view the permissions audit section
    const auditSection = page.locator('[data-testid="permissions-audit"]');
    await expect(auditSection).toBeVisible();
    
    // Then I should see recent permission changes
    await expect(page.locator('[data-testid="audit-entry"]')).toBeVisible();
    
    // And I should see who made the changes
    await expect(page.locator('[data-testid="audit-user"]')).toBeVisible();
    
    // And I should see what permissions were changed
    await expect(page.locator('[data-testid="audit-action"]')).toBeVisible();
    
    // And I should see when the changes were made
    await expect(page.locator('[data-testid="audit-timestamp"]')).toBeVisible();
    
    // When I filter audit entries by date range
    const dateFilter = page.locator('[data-testid="audit-date-filter"]');
    if (await dateFilter.count() > 0) {
      await dateFilter.fill('2024-01-01');
      
      // Then the audit entries should be filtered
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="filtered-audit-entries"]')).toBeVisible();
    }
  });

  test('should test permission enforcement', async ({ page }) => {
    // Given I am on the Permissions page
    await expect(page.locator('h1')).toContainText(/Permissions|Access/);
    
    // When I click "Test Permissions"
    const testButton = page.getByRole('button', { name: /test permissions/i });
    if (await testButton.count() > 0) {
      await testButton.click();
      
      // Then I should see the permission testing interface
      const testInterface = page.locator('[data-testid="permission-test-interface"]');
      await expect(testInterface).toBeVisible();
      
      // When I select a user role to test
      await page.locator('[data-testid="test-role-select"]').selectOption('Developer');
      
      // And I select an action to test
      await page.locator('[data-testid="test-action-select"]').selectOption('create-task');
      
      // And I click "Test Permission"
      await page.getByRole('button', { name: /test permission/i }).click();
      
      // Then I should see the permission test result
      await expect(page.locator('[data-testid="permission-test-result"]')).toBeVisible();
      
      // And I should see whether the action is allowed or denied
      const result = page.locator('[data-testid="permission-result"]');
      await expect(result).toContainText(/allowed|denied/i);
    }
  });
});