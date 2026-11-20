import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vite-plus/test"
import zod from "zod/v4"

import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldError, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

const NAME_REQUIRED = "Name is required."
const EMAIL_INVALID = "Enter a valid email address."
const UNRENDERED_FIELD_ERROR = "The account is closed."
const TEST_NAME = "Ada"
const TEST_EMAIL = "ada@example.com"
const FIELD_NAMES = ["name", "email"] as const

const schema = zod.object({
  email: zod.email({ message: EMAIL_INVALID }),
  name: zod.string().min(1, { message: NAME_REQUIRED }),
})

const closedAccountSchema = schema.refine(() => false, { message: UNRENDERED_FIELD_ERROR, path: ["account"] })

const TestForm = ({ onValid, schema: formSchema }: { readonly onValid: () => void; readonly schema: typeof schema }): JSX.Element => {
  const form = useForm({
    defaultValues: { email: "", name: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: onValid,
    validators: { onChange: formSchema },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      {FIELD_NAMES.map((name) => (
        <form.Field key={name} name={name}>
          {(field) => {
            const isInvalid = isFieldInvalid(field)

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={name}>{name}</FieldLabel>
                <Input
                  aria-describedby={`${name}-error`}
                  aria-invalid={isInvalid}
                  id={name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  value={field.state.value}
                />
                {isInvalid && <FieldError id={`${name}-error`}>{fieldErrorMessage(field.state.meta.errors)}</FieldError>}
              </Field>
            )
          }}
        </form.Field>
      ))}
      <Button type="submit">Submit</Button>
    </form>
  )
}

const renderForm = (formSchema: typeof schema = schema) => {
  const onValid = vi.fn<() => void>()
  render(<TestForm onValid={onValid} schema={formSchema} />)
  return {
    email: screen.getByLabelText("email"),
    name: screen.getByLabelText("name"),
    onValid,
    submit: screen.getByRole("button", { name: "Submit" }),
    user: userEvent.setup({ delay: null }),
  }
}

describe("form validation timing", () => {
  it("keeps an invalid value quiet while the visitor types and reports it when they leave the field", async () => {
    const { email, user } = renderForm()

    await user.type(email, "ada@")

    expect(email).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText(EMAIL_INVALID)).not.toBeInTheDocument()

    await user.tab()

    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(EMAIL_INVALID)).toHaveAttribute("id", "email-error")
  })

  it("clears a reported error on the keystroke that makes the value valid", async () => {
    const { email, user } = renderForm()
    await user.type(email, "ada@")
    await user.tab()

    await user.type(email, "example.com")

    expect(email).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText(EMAIL_INVALID)).not.toBeInTheDocument()

    await user.clear(email)

    expect(email).toHaveAttribute("aria-invalid", "true")
  })

  it("reports a field the visitor only passed through as soon as they leave it", async () => {
    const { email, name, user } = renderForm()

    await user.click(name)
    await user.tab()

    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(NAME_REQUIRED)).toBeVisible()
    expect(email).toHaveAttribute("aria-invalid", "false")
  })

  it("reports every error on submit and moves focus to the first invalid field", async () => {
    const { email, name, onValid, submit, user } = renderForm()

    await user.click(submit)

    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText(NAME_REQUIRED)).toBeVisible()
    expect(screen.getByText(EMAIL_INVALID)).toBeVisible()
    expect(name).toHaveFocus()
    expect(onValid).not.toHaveBeenCalled()
  })

  it("reports the field the visitor is typing in when they submit with Enter", async () => {
    const { email, name, onValid, user } = renderForm()
    await user.type(name, TEST_NAME)
    await user.tab()

    await user.type(email, "ada{Enter}")

    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(email).toHaveFocus()
    expect(name).toHaveAttribute("aria-invalid", "false")
    expect(onValid).not.toHaveBeenCalled()
  })

  it("submits a valid form, and pressing the button keeps focus in the field being edited", async () => {
    const { email, name, onValid, submit, user } = renderForm()
    await user.type(name, TEST_NAME)
    await user.type(email, TEST_EMAIL)

    await user.click(submit)

    expect(onValid).toHaveBeenCalledOnce()
    expect(email).toHaveFocus()
  })

  it("keeps the field being edited focused when its error appears as the button is pressed, so the press still submits", async () => {
    const { email, name, onValid, submit, user } = renderForm()
    await user.type(name, TEST_NAME)
    await user.type(email, "ada@")

    await user.click(submit)

    expect(onValid).not.toHaveBeenCalled()
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute("aria-invalid", "true")
  })

  it("leaves focus in place when the only error belongs to a value no field shows", async () => {
    const { email, name, onValid, submit, user } = renderForm(closedAccountSchema)
    await user.type(name, TEST_NAME)
    await user.type(email, TEST_EMAIL)

    await user.click(submit)

    expect(onValid).not.toHaveBeenCalled()
    expect(email).toHaveFocus()
    expect(name).toHaveAttribute("aria-invalid", "false")
  })
})
