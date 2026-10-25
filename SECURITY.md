# Security

This repository contains a demonstration application. It is not a production outage-management, dispatch, or emergency-response system. See [operating notes](docs/operations.md) for deployment requirements.

## Reporting

Use the repository's **Security → Report a vulnerability** option when private reporting is available. Otherwise contact the [repository owner](https://github.com/zaidkan) to arrange a private channel. Do not publish credentials, customer records, private topology, or an exploit containing sensitive source data in a public issue.

Include the affected revision, reproduction steps, impact, and a minimal redacted example.

## Data handling

Do not commit credentials, household information, raw technical identifiers, or private graph outputs. Public network exports must preserve anonymity and generalized geometry. A caller-provided session ID is not an authentication credential, and process-local state is not a production authorization boundary.
