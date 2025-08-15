import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function KeyboardShortcutsDemo() {
  const shortcuts = [
    { key: 'C', description: 'Custom action' },
    { key: 'P', description: 'Go to Projects' },
    { key: 'D', description: 'Go to Dashboard' },
    { key: 'L', description: 'Go to Logs' },
    { key: 'A', description: 'Go to Analytics' },
    { key: 'S', description: 'Go to Settings' },
    { key: 'Escape', description: 'Close dialog' },
    { key: 'Cmd/Ctrl + K', description: 'Search/Command palette' },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Keyboard Shortcuts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex justify-between items-center"
            >
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded border">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
