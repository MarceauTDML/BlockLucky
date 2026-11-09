'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/cn';

const fieldClasses = (hasError: boolean) =>
  cn(
    'w-full rounded-md border bg-surface px-3.5 py-[11px] text-body text-fg placeholder:text-fg-muted',
    'transition-colors focus:outline-none focus:border-primary focus-visible:outline-none',
    hasError ? 'border-error' : 'border-line'
  );

interface FieldWrapperProps {
  id: string;
  label?: string;
  hint?: string;
  errorText?: string;
  children: React.ReactNode;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({ id, label, hint, errorText, children }) => (
  <div className="mb-3">
    {label ? (
      <label htmlFor={id} className="mb-[5px] block text-caption font-medium text-fg-secondary">
        {label}
      </label>
    ) : null}
    {children}
    {hint && !errorText ? (
      <p id={`${id}-hint`} className="mt-1 text-caption text-fg-muted">
        {hint}
      </p>
    ) : null}
    {errorText ? (
      <p id={`${id}-error`} role="alert" className="mt-1 text-caption text-error">
        {errorText}
      </p>
    ) : null}
  </div>
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  errorText?: string;
}

export const Input: React.FC<InputProps> = ({ label, hint, errorText, className, id, ...rest }) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} errorText={errorText}>
      <input
        id={fieldId}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={errorText ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(fieldClasses(Boolean(errorText)), className)}
        {...rest}
      />
    </FieldWrapper>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  errorText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  hint,
  errorText,
  className,
  id,
  rows = 3,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} errorText={errorText}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={errorText ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(fieldClasses(Boolean(errorText)), 'resize-y', className)}
        {...rest}
      />
    </FieldWrapper>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  errorText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hint,
  errorText,
  className,
  id,
  children,
  ...rest
}) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} errorText={errorText}>
      <select
        id={fieldId}
        aria-invalid={errorText ? true : undefined}
        className={cn(fieldClasses(Boolean(errorText)), 'appearance-auto', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
};

export default Input;
