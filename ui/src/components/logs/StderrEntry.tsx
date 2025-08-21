import RawLogText from './RawLogText';

interface StderrEntryProps {
  content: string;
  timestamp?: string; // Optional for backward compatibility
}

function StderrEntry({ content }: StderrEntryProps) {
  return (
    <div className="flex gap-2 px-4">
      <RawLogText content={content} channel="stderr" as="span" />
    </div>
  );
}

export default StderrEntry;