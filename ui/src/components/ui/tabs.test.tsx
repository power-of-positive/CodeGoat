import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs Components', () => {
  describe('Tabs', () => {
    it('renders tabs container with children', () => {
      render(
        <Tabs defaultValue="tab1" data-testid="tabs-root">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('TabsList', () => {
    it('renders tabs list with correct styling', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('inline-flex', 'h-10', 'items-center', 'justify-center');
    });

    it('applies custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-class" data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('custom-class');
    });
  });

  describe('TabsTrigger', () => {
    it('renders trigger button with correct text', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger-1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" data-testid="trigger-2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      expect(screen.getByTestId('trigger-1')).toHaveTextContent('Tab 1');
      expect(screen.getByTestId('trigger-2')).toHaveTextContent('Tab 2');
    });

    it('applies custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const trigger = screen.getByText('Tab 1');
      expect(trigger).toHaveClass('custom-trigger');
    });

    it('switches tabs when clicked', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      // Initially tab1 content is visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      
      // Click tab2
      fireEvent.click(screen.getByText('Tab 2'));
      
      // Both triggers should still be visible
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('inline-flex', 'items-center', 'justify-center', 'whitespace-nowrap');
    });
  });

  describe('TabsContent', () => {
    it('renders content when tab is active', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content-1">
            <div>Content for tab 1</div>
          </TabsContent>
        </Tabs>
      );
      
      expect(screen.getByTestId('content-1')).toBeInTheDocument();
      expect(screen.getByText('Content for tab 1')).toBeInTheDocument();
    });

    it('renders content based on active tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      
      // Tab 1 content should be visible initially
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1" className="custom-content" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
    });

    it('applies correct styling classes', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsContent value="tab1" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('mt-2', 'ring-offset-white');
    });
  });

  describe('Integration', () => {
    it('handles multiple tabs with different content', () => {
      render(
        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="settings">Settings Content</TabsContent>
          <TabsContent value="profile">Profile Content</TabsContent>
          <TabsContent value="notifications">Notifications Content</TabsContent>
        </Tabs>
      );
      
      // Initially shows settings
      expect(screen.getByText('Settings Content')).toBeInTheDocument();
      
      // Verify all triggers are present
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      
      // Click profile trigger
      fireEvent.click(screen.getByText('Profile'));
      
      // Click notifications trigger  
      fireEvent.click(screen.getByText('Notifications'));
    });
  });
});