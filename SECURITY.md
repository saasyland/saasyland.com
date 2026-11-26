# Security policy

## Supported versions

| Version                                                                      | Supported |
| ---------------------------------------------------------------------------- | --------- |
| [saasyland.com](https://saasyland.com) and `main`                            | Yes       |
| The latest dated release                                                     | Yes       |
| The newest release of `saasyland`, `create-saasyland` and `@saasyland/stack` | Yes       |
| Earlier releases and commits                                                 | No        |

Merges to `main` deploy to saasyland.com once CI passes, so fixes reach the site first. See [CI/CD](https://saasyland.com/docs/tooling/ci-cd). The CLI and its packages are released together under one version, and a fix ships as a new release on npm; see the [release notes](https://saasyland.com/docs/cli/releases).

## Reporting a vulnerability

Do not report vulnerabilities in public issues, pull requests or comments. Report them privately with GitHub's [private vulnerability reporting](https://github.com/saasyland/saasyland.com/security/advisories/new), or by email to hello@saasyland.com.

Include:

- what is affected: a URL, route, server function or file;
- the steps to reproduce it, or a proof of concept;
- the impact: what an attacker can read, change or do;
- the commit or release, if you tested your own deployment.

## What to expect

These are targets, not guarantees:

- an acknowledgement within three working days;
- an assessment within ten working days, with a plan for a fix if the issue is confirmed;
- updates until the fix is deployed, then a GitHub security advisory that credits you, unless you prefer not to be named.

Please give us reasonable time to fix a confirmed issue before you disclose it.

SaaSy Land reports actively exploited vulnerabilities and severe incidents that affect its products through the EU Single Reporting Platform, as the Cyber Resilience Act (Regulation (EU) 2024/2847) requires.

## Scope

In scope: saasyland.com, including the customer workspace and admin console, and the code in this repository. Report vulnerabilities in the paid CLI, licence keys or activations to hello@saasyland.com as well; they are handled the same way.

Out of scope: vulnerabilities in third-party services such as Cloudflare, Polar and Resend, unless our configuration causes them, and scanner output without a demonstrated impact.

The [security policy](https://saasyland.com/docs/project/security-policy) in the docs says the same in every language of the site, and [`/.well-known/security.txt`](https://saasyland.com/.well-known/security.txt) (RFC 9116) names the contact.

## Security in the code

- [Security and hardening](https://saasyland.com/docs/features/security): the controls the app implements, and the ones it does not.
- [Authentication and security](https://saasyland.com/docs/architecture/security-model): how routes and server functions enforce access.
- [Security checklist](https://saasyland.com/docs/guides/security-checklist): what to verify before merging a change.
