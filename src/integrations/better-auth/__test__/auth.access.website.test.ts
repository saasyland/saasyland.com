import { defaultStatements } from "better-auth/plugins/admin/access"
import { describe, expect, it } from "vite-plus/test"

import { ROLES, ac } from "~/src/integrations/better-auth/auth.access"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

describe("the website's access control", () => {
  it("keeps the statements and every role's permissions of the website", () => {
    expect({
      resources: Object.keys(ac.statements),
      roles: Object.fromEntries(Object.entries(ROLES).map(([role, { statements }]) => [role, statements])),
      statements: ac.statements,
    }).toMatchInlineSnapshot(`
      {
        "resources": [
          "user",
          "session",
          "admin",
          "category",
          "course",
          "order",
          "product",
          "settings",
          "video",
        ],
        "roles": {
          "admin": {
            "admin": [
              "access",
            ],
            "category": [
              "create",
              "read",
              "update",
              "delete",
            ],
            "course": [
              "create",
              "read",
              "update",
              "delete",
            ],
            "order": [
              "read",
              "update",
              "refund",
            ],
            "product": [
              "create",
              "read",
              "update",
              "delete",
              "publish",
            ],
            "session": [
              "list",
              "revoke",
              "delete",
            ],
            "settings": [
              "manage",
            ],
            "user": [
              "create",
              "list",
              "set-role",
              "ban",
              "impersonate",
              "delete",
              "set-password",
              "set-email",
              "set-phone",
              "get",
              "update",
            ],
            "video": [
              "read",
              "delete",
            ],
          },
          "customer": {},
        },
        "statements": {
          "admin": [
            "access",
          ],
          "category": [
            "create",
            "read",
            "update",
            "delete",
          ],
          "course": [
            "create",
            "read",
            "update",
            "delete",
          ],
          "order": [
            "read",
            "update",
            "refund",
          ],
          "product": [
            "create",
            "read",
            "update",
            "delete",
            "publish",
          ],
          "session": [
            "list",
            "revoke",
            "delete",
          ],
          "settings": [
            "manage",
          ],
          "user": [
            "create",
            "list",
            "set-role",
            "ban",
            "impersonate",
            "impersonate-admins",
            "delete",
            "set-password",
            "set-email",
            "set-phone",
            "get",
            "update",
          ],
          "video": [
            "read",
            "delete",
          ],
        },
      }
    `)
  })
})

describe("the order of the website's access control", () => {
  it("declares each resource once, in resource order after Better Auth's own, and grants admins all of them in that order", () => {
    expect(Object.entries(ac.statements).map(([resource, actions]) => [resource, [...actions]])).toStrictEqual([
      ["user", [...defaultStatements.user]],
      ["session", [...defaultStatements.session]],
      ["admin", ["access"]],
      ["category", ["create", "read", "update", "delete"]],
      ["course", ["create", "read", "update", "delete"]],
      ["order", ["read", "update", "refund"]],
      ["product", ["create", "read", "update", "delete", "publish"]],
      ["settings", ["manage"]],
      ["video", ["read", "delete"]],
    ])
    expect(Object.keys(ROLES[ROLE_CODES.ADMIN].statements)).toStrictEqual([
      "admin",
      "category",
      "course",
      "order",
      "product",
      "settings",
      "video",
      "user",
      "session",
    ])
  })
})
