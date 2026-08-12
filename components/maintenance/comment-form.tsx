"use client";

import { useActionState, useRef, useEffect } from "react";
import { addComment } from "@/lib/actions/maintenance";
import type { ActionState } from "@/lib/actions/properties";
import { FormError, SubmitButton, TextArea } from "@/components/ui/form";

export function CommentForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addComment, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="space-y-3" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <FormError message={state.errors?._form ?? state.errors?.body} />
      <TextArea label="Add a comment" name="body" rows={3} />
      <SubmitButton variant="secondary">Post comment</SubmitButton>
    </form>
  );
}
