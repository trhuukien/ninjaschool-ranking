"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FormState } from "./actions/form";

/**
 * A <form> wired to an admin Server Action through useActionState: shows the
 * action's error/message under the fields and disables the submit button
 * while it runs. `confirm` asks before submitting (for deletes).
 *
 * It submits by hand instead of through <form action>, because React resets
 * uncontrolled fields after a form action — which would wipe what the admin
 * typed whenever the action comes back with a validation error. Forms that
 * should clear after a successful save (e.g. "add new") pass resetOnSuccess.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Đang lưu...",
  confirm,
  danger = false,
  resetOnSuccess = false,
  className = "flex flex-col gap-3",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  confirm?: string;
  danger?: boolean;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.message && !state.error) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={
            "rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50 " +
            (danger
              ? "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              : "bg-accent text-white hover:bg-accent-strong")
          }
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.message && !state.error && <p className="text-sm text-green-400">{state.message}</p>}
      </div>
    </form>
  );
}
