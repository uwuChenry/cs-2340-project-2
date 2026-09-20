import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-muted mb-1.5">{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`w-full px-[11px] py-[9px] border border-line-strong rounded-lg bg-surface-sunken text-[14px] focus:outline-none focus:border-accent ${className}`}
      {...rest}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      className={`w-full px-[11px] py-[9px] border border-line-strong rounded-lg bg-surface-sunken text-[14.5px] focus:outline-none focus:border-accent ${className}`}
      {...rest}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      className={`w-full px-3 py-[11px] border border-line-strong rounded-lg bg-surface text-[13.5px] leading-[1.55] resize-y focus:outline-none focus:border-accent ${className}`}
      {...rest}
    />
  );
}

export function RangeInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input type="range" className={`w-full accent-accent ${className}`} {...rest} />;
}

// A validation message under the input it belongs to.
export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p role="alert" className="m-0 mt-1.5 text-[12.5px] leading-[1.4] text-danger">
      {messages.join(" ")}
    </p>
  );
}
