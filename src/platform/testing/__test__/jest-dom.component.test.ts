import { expect, expectTypeOf, it } from "vite-plus/test"

it("registers typed DOM matchers for synchronous and asynchronous assertions", async () => {
  expect.hasAssertions()

  const element = document.createElement("button")
  element.textContent = "Save changes"

  const synchronous = expect(element)
  synchronous.toHaveTextContent(/save/iu)
  expect(element).not.toBeDisabled()
  expectTypeOf<typeof synchronous.toHaveTextContent>().returns.toEqualTypeOf<void>()
  expectTypeOf<typeof synchronous.toHaveTextContent>().parameter(0).toEqualTypeOf<string | RegExp>()

  const resolved = expect(Promise.resolve(element)).resolves
  expectTypeOf<typeof resolved.toHaveTextContent>().returns.toEqualTypeOf<Promise<void>>()
  await resolved.toHaveTextContent(/changes/iu)
  await expect.poll(() => element).toBeEnabled()
})
