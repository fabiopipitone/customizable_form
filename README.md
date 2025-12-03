# Customizable Form Plugin

Customizable Form is a Kibana plugin that delivers “form-based” visualizations to collect user input and trigger Kibana Action connectors directly from inside a dashboard.

---

## Features
- Customization the form composition in terms of number of columns, title, description
- Choice of any Kibana Connector you have previously created (as for now only the Index, Webhook, Email, Jira and MS Teams are supported), even more than one that must be triggered at the same time (e.g. the same submission must open a Jira ticket and send an email)
- Personalization all the fields in terms of:
  - order in the form
  - label 
  - variable name (to be used in the payload template)
  - placeholder
  - input type (single or multiline)
  - data type (string, number or boolean)
  - min/max size (characters for strings or lower/upper bounds for number)
  - mandatoriness of a field (optional or required)
- Personalization the payload templates that will be used by the connector (some connectors require specific template)
- Fields and parameters checks, inhibiting the visualization saving, in order to prevent any possible mistake
- Real time preview in edit mode
- Submission timestamp usable in payload templates via the `__submission_timestamp__` variable
- Optional confirmation modal before submission

---

## Demo
<TBD>

---

## Getting Started

### Install on Kibana

Every release package includes a Plugin version (X.Y.Z) and a Kibana version (A.B.C).

- Go to [releases](https://github.com/fabiopipitone/customizable_form/releases) and choose the right one for your Kibana version
- launch a shell terminal and go to $KIBANA_HOME folder
- use Kibana CLI to install :
  - directly from Internet URL :
`./bin/kibana-plugin install https://github.com/fabiopipitone/customizable_form/releases/download/vX.Y.Z/customizableForm-X.Y.Z-kibana-A.B.C.zip`
  - locally after manual download :
`./bin/kibana-plugin install file:///path/to/customizableForm-X.Y.Z_A.B.C.zip`
- restart Kibana

---

## Structured connector payloads

Some connectors require a specific JSON structure. The builder enforces the most common subset of rules so users catch mistakes before hitting the connector API.

- **Email (`.email`)** — the template must render:

  ```json
  {
    "to": ["<target email address>"],
    "subject": "<email subject>",
    "message": "<email message>"
  }
  ```

  Optional fields such as `cc`, `bcc`, `messageHTML`, and `attachments` are supported, but the validator requires at least one recipient plus subject/message strings.

- **Jira (`.jira`)** — the template must render a `pushToService` payload:

  ```json
  {
    "subAction": "pushToService",
    "subActionParams": {
      "incident": {
        "summary": "<issue summary>",
        "description": "<issue description>",
        "issueType": "Task",
        "priority": "Medium"
      }
    }
  }
  ```

  You may add `issueType`, `priority`, `parent`, `labels`, or `comments` manually, but copy the exact values/IDs from the Jira connector test panel (or your Jira project) to avoid downstream failures. Additional fields are intentionally blocked.

- **Microsoft Teams (`.teams`)** — payloads must include the `message` field:

  ```json
  {
    "message": "{{message}}"
  }
  ```

  Optional fields are not supported; any extra keys will trigger an error in the builder.

- **Submission timestamp** — regardless of connector type, you can inject the ISO timestamp of the submission via `{{__submission_timestamp__}}`. The actual value is filled when the user clicks Submit.

Invalid structures surface directly in the Payload tab and block both Save and Submit.

---

## 2. Development & Contribution

### 2.1 Environment requirements
- Kibana repo with the plugin located at `kibana/plugins/customizable_form`.
- Node/Yarn versions aligned with the Kibana branch (use `nvm use` before running scripts).
- `BROWSERSLIST_IGNORE_OLD_DATA=1` recommended during builds for faster output.

### 2.2 Quick setup
```bash
yarn kbn bootstrap        # install dependencies for Kibana + plugin
yarn plugin-helpers dev   # build UI assets in watch mode
yarn plugin-helpers build # produce distributable artifact
```
Run tests with `node ../../scripts/jest --runTestsByPath <path-to-test>` after activating the proper Node version.

### 2.3 Directory layout (excerpt)
```
public/
  components/form_builder/
    form_builder.tsx            # builder entry point
    form_builder_layout.tsx     # 3-column layout
    configuration_tabs/         # general, fields, connectors, payload tabs
    hooks/                      # lifecycle + derived state hooks
    utils/                      # shared helpers (shared.ts, form_helpers.ts, serialization.ts)
  embeddable/
    customizable_form_embeddable.tsx
services/
  persistence.ts, library_client.ts, core_services.ts, embeddable_state_transfer.ts
server/
  plugin.ts (registration boilerplate)
common/
  types.ts, content_management/
```

### 2.4 Contribution guidelines
- **Incremental refactors**: keep each step self-contained (e.g., context extraction, hook split, shared handler map).
- **Testing**: every new hook/component needs a focused Jest test; rely on smoke tests for builder/embeddable flows.
- **Context first**: avoid deep prop chains—consume store via `FormBuilderProvider`.
- **Service boundaries**: any network/persistence interaction lives in `public/services` to keep components testable.
- **Manual QA notes**: describe console/dashboard scenarios when code touches user flows.

---

## 3. Structured connector payloads

Some connectors require a specific JSON structure. The builder enforces the most common subset of rules so users catch mistakes before hitting the connector API.

- **Email (`.email`)** — the template must render:

  ```json
  {
    "to": ["<target email address>"],
    "subject": "<email subject>",
    "message": "<email message>"
  }
  ```

  Optional fields such as `cc`, `bcc`, `messageHTML`, and `attachments` are supported, but the validator requires at least one recipient plus subject/message strings.

- **Jira (`.jira`)** — the template must render a `pushToService` payload:

  ```json
  {
    "subAction": "pushToService",
    "subActionParams": {
      "incident": {
        "summary": "<issue summary>",
        "description": "<issue description>",
        "issueType": "Task",
        "priority": "Medium"
      }
    }
  }
  ```

  You may add `issueType`, `priority`, `parent`, `labels`, or `comments` manually, but copy the exact values/IDs from the Jira connector test panel (or your Jira project) to avoid downstream failures. Additional fields are intentionally blocked.

- **Microsoft Teams (`.teams`)** — payloads must include the `message` field:

  ```json
  {
    "message": "{{message}}"
  }
  ```

  Optional fields are not supported; any extra keys will trigger an error in the builder.

- **Submission timestamp** — regardless of connector type, you can inject the ISO timestamp of the submission via `{{__submission_timestamp__}}`. The actual value is filled when the user clicks Submit.

Invalid structures surface directly in the Payload tab and block both Save and Submit.

---

## Appendices

### A. Testing matrix (excerpt)
| Test file | Coverage |
|-----------|----------|
| `public/components/form_builder/__tests__/form_builder.test.tsx` | Builder spinner/error/layout states. |
| `public/components/form_builder/__tests__/form_builder_layout.test.tsx` | Panel wiring + submit confirmation. |
| `public/components/form_builder/__tests__/configuration_panel.test.tsx` | Tabs + Save button state. |
| `public/components/form_builder/hooks/__tests__/use_form_builder_lifecycle.test.tsx` | Lifecycle hook orchestration (mocked services). |
| `public/components/form_builder/hooks/__tests__/use_connector_state.test.tsx` | Connector summaries, warnings, errors. |
| `public/components/form_builder/hooks/__tests__/use_payload_templates.test.tsx` | Payload rendering + validation. |
| `public/components/form_builder/hooks/__tests__/use_connector_execution.test.tsx` | Submit flow, confirmation modal, error handling. |
| `public/components/form_builder/hooks/__tests__/use_field_validation.test.tsx` | Field + variable name validation maps and flags. |
| `public/components/form_builder/utils/__tests__/form_helpers.test.ts` | Field value helpers, error message extraction. |
| `public/components/form_builder/utils/__tests__/shared.test.ts` | Connector summary builder utilities. |
| `public/components/form_builder/__tests__/preview_card.test.tsx` / `info_panel.test.tsx` | Component rendering, prop forwarding, warning badges. |
| `public/components/form_builder/__tests__/serialization.test.ts` | Layout/size normalization + round-trip serialization. |
| `public/components/form_builder/__tests__/validation.test.ts` | `validateVariableName` rules. |
| `public/embeddable/__tests__/customizable_form_embeddable.test.tsx` | Embeddable load/error/success + confirmation logic. |
---