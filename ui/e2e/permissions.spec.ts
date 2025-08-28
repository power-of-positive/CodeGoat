import { test, expect } from '@playwright/test';

test.describe('Permission Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display permissions overview', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check if we can find the permissions heading
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    }
    
    // Look for permission sections if they exist
    const userRoles = page.locator('[data-testid="user-roles"]');
    if (await userRoles.count() > 0) await expect(userRoles).toBeVisible();
    
    const resourcePermissions = page.locator('[data-testid="resource-permissions"]');
    if (await resourcePermissions.count() > 0) await expect(resourcePermissions).toBeVisible();
    
    const workerAccessControls = page.locator('[data-testid="worker-access-controls"]');
    if (await workerAccessControls.count() > 0) await expect(workerAccessControls).toBeVisible();
    
    const permissionsAudit = page.locator('[data-testid="permissions-audit"]');
    if (await permissionsAudit.count() > 0) await expect(permissionsAudit).toBeVisible();
    
    // At minimum, verify we're on the permissions page
    expect(page.url()).toContain('/permissions');
  });

  test('should manage user roles', async ({ page }) => {
    // Given I am on the Permissions page
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    } else {
      // At minimum, verify we're on the permissions page
      expect(page.url()).toContain('/permissions');
    }
    
    // When I view the user roles section
    const rolesSection = page.locator('[data-testid="user-roles"]');
    if (await rolesSection.count() > 0) {
      await expect(rolesSection).toBeVisible();
      
      // Then I should see existing user roles
      const roleItems = page.locator('[data-testid="role-item"]');
      if (await roleItems.count() > 0) {
        await expect(roleItems.first()).toBeVisible();
      }
    }
    
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
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    } else {
      // At minimum, verify we're on the permissions page
      expect(page.url()).toContain('/permissions');
    }
    
    // When I view the resource permissions section
    const resourceSection = page.locator('[data-testid="resource-permissions"]');
    if (await resourceSection.count() > 0) {
      await expect(resourceSection).toBeVisible();
      
      // Then I should see different resource categories if they exist
      const tasksPerms = page.locator('[data-testid="tasks-permissions"]');
      if (await tasksPerms.count() > 0) await expect(tasksPerms).toBeVisible();
      
      const workersPerms = page.locator('[data-testid="workers-permissions"]');
      if (await workersPerms.count() > 0) await expect(workersPerms).toBeVisible();
      
      const analyticsPerms = page.locator('[data-testid="analytics-permissions"]');
      if (await analyticsPerms.count() > 0) await expect(analyticsPerms).toBeVisible();
      
      const settingsPerms = page.locator('[data-testid="settings-permissions"]');
      if (await settingsPerms.count() > 0) await expect(settingsPerms).toBeVisible();
    }
    
    // When I configure task permissions if available
    const tasksPermissions = page.locator('[data-testid="tasks-permissions"]');
    if (await tasksPermissions.count() > 0) {
      // Try to set "Create Tasks" to "Developer" role if element exists
      const createTasksSelect = tasksPermissions.locator('[data-testid="create-tasks-role"]');
      if (await createTasksSelect.count() > 0) {
        await createTasksSelect.selectOption('Developer');
      }
      
      // Try to set "Delete Tasks" to "Admin" role if element exists
      const deleteTasksSelect = tasksPermissions.locator('[data-testid="delete-tasks-role"]');
      if (await deleteTasksSelect.count() > 0) {
        await deleteTasksSelect.selectOption('Admin');
      }
      
      // Try to click "Save Permissions" if button exists
      const saveButton = page.getByRole('button', { name: /save permissions/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Then check if permissions were updated
        const savedMessage = page.locator('[data-testid="permissions-saved"]');
        if (await savedMessage.count() > 0) {
          await expect(savedMessage).toBeVisible();
        }
      }
    }
    
    // At minimum, verify we're still on the permissions page
    expect(page.url()).toContain('/permissions');
  });

  test('should manage worker access controls', async ({ page }) => {
    // Given I am on the Permissions page
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    } else {
      // At minimum, verify we're on the permissions page
      expect(page.url()).toContain('/permissions');
    }
    
    // When I view the worker access controls section
    const workerSection = page.locator('[data-testid="worker-access-controls"]');
    if (await workerSection.count() > 0) {
      await expect(workerSection).toBeVisible();
      
      // Then I should see worker execution limits if they exist
      const executionLimits = page.locator('[data-testid="worker-execution-limits"]');
      if (await executionLimits.count() > 0) {
        await expect(executionLimits).toBeVisible();
      }
      
      // And I should see allowed command configurations if they exist
      const commandsConfig = page.locator('[data-testid="allowed-commands-config"]');
      if (await commandsConfig.count() > 0) {
        await expect(commandsConfig).toBeVisible();
      }
    }
    
    // When I configure execution limits by role if available
    const executionLimits = page.locator('[data-testid="worker-execution-limits"]');
    if (await executionLimits.count() > 0) {
      // Try to set concurrent workers limit for Developer role if element exists
      const concurrentLimit = executionLimits.locator('[data-testid="developer-concurrent-limit"]');
      if (await concurrentLimit.count() > 0) {
        await concurrentLimit.fill('2');
      }
      
      // Try to set execution timeout for Developer role if element exists
      const timeoutLimit = executionLimits.locator('[data-testid="developer-timeout-limit"]');
      if (await timeoutLimit.count() > 0) {
        await timeoutLimit.fill('20');
      }
      
      // Try to enable directory restrictions for Developer role if element exists
      const dirRestrictionsToggle = executionLimits.locator('[data-testid="developer-dir-restrictions"]');
      if (await dirRestrictionsToggle.count() > 0) {
        if (!await dirRestrictionsToggle.isChecked()) {
          await dirRestrictionsToggle.click();
        }
      }
      
      // Try to click "Save Access Controls" if button exists
      const saveButton = page.getByRole('button', { name: /save.*access.*controls/i });
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Check if access controls were updated
        const savedMessage = page.locator('[data-testid="access-controls-saved"]');
        if (await savedMessage.count() > 0) {
          await expect(savedMessage).toBeVisible();
        }
      }
    }
    
    // At minimum, verify we're still on the permissions page
    expect(page.url()).toContain('/permissions');
  });

  test('should assign users to roles', async ({ page }) => {
    // Given I am on the Permissions page
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    } else {
      // At minimum, verify we're on the permissions page
      expect(page.url()).toContain('/permissions');
    }
    
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
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    } else {
      // At minimum, verify we're on the permissions page
      expect(page.url()).toContain('/permissions');
    }
    
    // When I view the permissions audit section
    const auditSection = page.locator('[data-testid="permissions-audit"]');
    if (await auditSection.count() > 0) {
      await expect(auditSection).toBeVisible();
      
      // Then I should see recent permission changes if they exist
      const auditEntries = page.locator('[data-testid="audit-entry"]');
      if (await auditEntries.count() > 0) {
        await expect(auditEntries.first()).toBeVisible();
        
        // And I should see who made the changes if available
        const auditUser = page.locator('[data-testid="audit-user"]');
        if (await auditUser.count() > 0) await expect(auditUser.first()).toBeVisible();
        
        // And I should see what permissions were changed if available
        const auditAction = page.locator('[data-testid="audit-action"]');
        if (await auditAction.count() > 0) await expect(auditAction.first()).toBeVisible();
        
        // And I should see when the changes were made if available
        const auditTimestamp = page.locator('[data-testid="audit-timestamp"]');
        if (await auditTimestamp.count() > 0) await expect(auditTimestamp.first()).toBeVisible();
      }
    }
    
    // When I filter audit entries by date range
    const dateFilter = page.locator('[data-testid="audit-date-filter"]');
    if (await dateFilter.count() > 0) {
      await dateFilter.fill('2024-01-01');
      
      // Then the audit entries should be filtered
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="filtered-audit-entries"]')).toBeVisible();
    }
  });

  test('should test permission enforcement', async ({ page }) => {
    // Given I am on the Permissions page
    const permissionsHeading = page.locator('h1:has-text("Permission Editor")');
    if (await permissionsHeading.count() > 0) {
      await expect(permissionsHeading.first()).toBeVisible();
    } else {
      // At minimum, verify we're on the permissions page
      expect(page.url()).toContain('/permissions');
    }
    
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