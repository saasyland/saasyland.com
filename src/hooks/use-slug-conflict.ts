import { toast } from "sonner"

import { type FieldErrorTarget, showFieldError } from "~/src/integrations/tanstack-form/form.submit"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { useErrorMessage } from "~/src/hooks/use-error-message"

interface SlugControl {
  readonly controlId: string
  readonly message: string
}

export const useSlugConflict = ({ controlId, message }: SlugControl) => {
  const errorMessage = useErrorMessage()

  return (form: FieldErrorTarget<"slug">) =>
    (error: Error): void => {
      if (error.message === ERROR_CODES.CONFLICT) {
        showFieldError(form, { controlId, field: "slug", message })
        return
      }
      toast.error(errorMessage(error))
    }
}
