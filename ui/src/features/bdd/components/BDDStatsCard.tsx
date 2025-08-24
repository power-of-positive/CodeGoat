import React from 'react';
import { Card, CardContent } from '../../../shared/ui/card';

export function StatsCard({ title, count, icon: Icon, testId }: {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold" data-testid={testId}>
              {count}
            </p>
          </div>
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}