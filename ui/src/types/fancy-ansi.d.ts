declare module 'fancy-ansi/react' {
  import type { CSSProperties } from 'react';
  
  export type AnsiHtmlProps = {
    className?: string;
    text?: string;
    style?: CSSProperties;
  };
  
  export const AnsiHtml: ({ className, style, text }: AnsiHtmlProps) => JSX.Element;
}