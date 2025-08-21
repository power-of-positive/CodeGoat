import RawLogText from './RawLogText';

interface StdoutEntryProps {
  content: string;
  timestamp?: string; // Optional for backward compatibility
}

function StdoutEntry({ content }: StdoutEntryProps) {
  return (
    <div className="flex gap-2 px-4">
      <RawLogText content={content} channel="stdout" as="span" />
    </div>
  );
}

export default StdoutEntry;