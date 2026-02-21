import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffViewer } from './DiffViewer';

const sampleDiff = `diff --git a/src/example.ts b/src/example.ts
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,2 +1,3 @@
-const value = 1;
+const value = 2;
 const next = value + 1;
+console.log(next);
`;

describe('DiffViewer', () => {
  it('renders diff details, badges, and toggles sections', () => {
    render(
      <DiffViewer
        diff={sampleDiff}
        diffStat={'1 file changed, 2 insertions(+), 1 deletion(-)'}
        changedFiles={[
          { status: 'A', path: 'src/new.ts' },
          { status: 'M', path: 'src/example.ts' },
          { status: 'D', path: 'src/old.ts' },
          { status: 'R', path: 'README.md' },
        ]}
        worktreePath="/tmp/worktree"
      />
    );

    expect(screen.getByText('Changes (4 files)')).toBeInTheDocument();
    expect(screen.getByText('/tmp/worktree')).toBeInTheDocument();
    expect(screen.getByText('1 file changed, 2 insertions(+), 1 deletion(-)')).toBeInTheDocument();

    // Ensure badges for each status render
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
    expect(screen.getByText('Changed')).toBeInTheDocument();

    // Collapse a file from the changed files list
    const changedFileButton = screen.getByRole('button', { name: /src\/example\.ts/i });
    fireEvent.click(changedFileButton);
    expect(
      screen.getByText('Diff collapsed. Click "Expand" to view changes.')
    ).toBeInTheDocument();

    // Expand the file again via diff section toggle
    const expandButton = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandButton);
    expect(screen.getByRole('button', { name: /Collapse/i })).toBeInTheDocument();

    // Verify diff lines are highlighted
    expect(screen.getByText('const value = 2;')).toBeInTheDocument();
    expect(screen.getByText('const next = value + 1;')).toBeInTheDocument();
    expect(screen.getByText('console.log(next);')).toBeInTheDocument();
  });

  it('renders fallback card when there are no changes', () => {
    render(<DiffViewer />);
    expect(screen.getByText('No changes detected')).toBeInTheDocument();
  });
});
