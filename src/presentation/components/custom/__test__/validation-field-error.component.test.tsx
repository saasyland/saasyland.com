import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import errorsMessages from "~/messages/en-US/errors.json"

const NAMESPACE = "sample.validations"

const MIN_LENGTH_PARAMS = { tooShort: { min: 8 } }

const messages = {
  errors: errorsMessages,
  sample: { validations: { required: "This field is required.", tooShort: "Use at least {min} characters." } },
}

const renderWithMessages = (node: React.ReactNode): ReturnType<typeof render> =>
  render(
    <IntlProvider locale="en-US" messages={messages}>
      {node}
    </IntlProvider>,
  )

describe("validationFieldError", () => {
  it("renders nothing when there is no message", () => {
    expect.hasAssertions()
    const { container } = renderWithMessages(<ValidationFieldError namespace={NAMESPACE} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing for an empty message", () => {
    expect.hasAssertions()
    const { container } = renderWithMessages(<ValidationFieldError message="" namespace={NAMESPACE} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("translates a validation key through the given namespace", () => {
    expect.hasAssertions()
    renderWithMessages(<ValidationFieldError message="required" namespace={NAMESPACE} />)

    expect(screen.getByText(messages.sample.validations.required)).toBeInTheDocument()
  })

  it("passes interpolation params through for the key that declares them", () => {
    expect.hasAssertions()
    renderWithMessages(<ValidationFieldError message="tooShort" namespace={NAMESPACE} params={MIN_LENGTH_PARAMS} />)

    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument()
  })

  it("falls back to the generic validation message when the namespace has no translation for the error", () => {
    expect.hasAssertions()
    renderWithMessages(<ValidationFieldError id="email-error" message="notATranslatedCode" namespace={NAMESPACE} />)

    expect(screen.getByText(errorsMessages.codes.VALIDATION)).toHaveAttribute("id", "email-error")
    expect(screen.queryByText(/notATranslatedCode/u)).not.toBeInTheDocument()
  })
})
