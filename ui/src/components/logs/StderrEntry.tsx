interface StderrEntryProps {
  content: string;
}

function StderrEntry({ content }: StderrEntryProps) {
  return (
    <div className="flex gap-2 text-xs font-mono px-4">
      <span className="text-red-600 dark:text-red-400 break-all">{content}</span>
    </div>
  );
}

export default StderrEntry;
