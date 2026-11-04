# Sending detection-rule proposals to ATR

PanGuard can turn what it catches on your machine into a proposal for a new
[ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) detection rule.
The path works without Threat Cloud and without any account other than your own
GitHub account.

## How a proposal is made

| Source                                      | When                                                    |
| ------------------------------------------- | ------------------------------------------------------- |
| `pga up`, `pga audit <path>`                | A skill is rated HIGH or CRITICAL                       |
| Guard's skill watcher                       | A newly installed skill is rated HIGH or CRITICAL       |
| Guard's rule drafter (opt-in, needs an LLM) | A pattern repeats often enough for a rule to be drafted |

Each proposal is converted to the fields of ATR's "New Rule Proposal" issue form,
de-identified, and written to `~/.panguard/proposals/<id>.json` (mode 0600). One
file per detected pattern: seeing the same pattern again does not create a
duplicate. Nothing is sent at this point.

If Threat Cloud upload is turned on, the proposal is also sent there, as before.
When Threat Cloud is unreachable the proposal is no longer lost: it stays in the
local outbox.

## Reviewing and sending

```bash
pga proposals list
pga proposals show <id>          # add --open to open the issue form too
pga proposals submit <id>        # add --no-open to only print the link
```

`submit` opens a pre-filled issue on the ATR repository in your browser. The
form is not submitted: you review it, change anything you like, and press
Submit yourself. The issue template adds the `new-rule` label, which starts
ATR's own intake: a draft proposal file is opened as a pull request, and a
maintainer or contributor writes the detection and its tests. A rule only ships
after ATR's usual checks, including the false-positive gate.

## What is removed before anything reaches the form

The issue is public, so every field is de-identified on your machine first:

- secrets: cloud keys, GitHub/Anthropic/OpenAI/Stripe tokens, private-key
  blocks, database URLs, bearer tokens;
- token-shaped strings: JWTs, long hex strings, long base64-like runs;
- home-directory paths (`/Users/<name>`, `/home/<name>`, `C:\Users\<name>`),
  your user name and your host name;
- email addresses and IP addresses (loopback addresses are kept);
- the name of the skill that was flagged is never included.

Only the matched snippet is used as the example payload. When the issue link
would be too long for a browser, the payload is shortened and the form says so;
the full copy stays on your machine.

De-identification is pattern-based and cannot recognise everything that might
identify you or your employer (an internal project name inside a snippet, for
example). Read the text `pga proposals show <id>` prints before you submit.
