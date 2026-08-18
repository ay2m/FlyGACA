# Security Policy

Fly GACA (flygaca.com) is operated by **BDA Company International (شركة بدع الدولية)**,
Riyadh, Saudi Arabia — CR 7030976893.

## Supported Versions

Fly GACA is a continuously deployed web application — only the **latest deployed
version** (what is live at [flygaca.com](https://flygaca.com)) receives security
fixes. There are no maintained release branches.

## Reporting a Vulnerability

Please report vulnerabilities privately — do not open a public issue.

- **Email:** i@flygaca.com (subject line starting with `[SECURITY]`)
- Include: a description of the issue, steps to reproduce, the affected URL or
  component, and any proof-of-concept you have.

What to expect:

1. **Acknowledgement within 5 business days.**
2. We will investigate, keep you informed of progress, and tell you whether the
   report is accepted or declined.
3. Accepted issues are fixed in the live deployment as quickly as severity
   warrants; we will credit you (with your permission) once the fix is out.

Please act in good faith: no accessing other users' data, no service
disruption, and give us reasonable time to fix before public disclosure.

## Scope

- The web app and its API surface (`flygaca.com`, `/api/*`).
- The Cloud Run backend in this repository (`server/`).

Third-party services (Google Cloud, Moyasar, hosting mirrors) should be reported to
their own programs, but feel free to notify us as well.
