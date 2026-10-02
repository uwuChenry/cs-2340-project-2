import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-extrabold text-muted mb-1.5">
      {children}
    </label>
  );
}

const control =
  "w-full border-2 border-line rounded-[14px] bg-white font-semibold text-ink-2 focus:outline-3 focus:outline-sun focus:outline-offset-1";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${control} px-3.5 py-2.5 text-[14px] ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`${control} px-3.5 py-2.5 text-[14px] cursor-pointer ${className}`} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${control} px-3.5 py-3 text-[14.5px] leading-[1.55] resize-y ${className}`} {...rest} />;
}

export function RangeInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input type="range" className={`w-full accent-accent cursor-pointer ${className}`} {...rest} />;
}

// A validation message under the input it belongs to.
export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p role="alert" className="m-0 mt-1.5 text-[12.5px] font-bold leading-[1.4] text-danger">
      {messages.join(" ")}
    </p>
  );
}
