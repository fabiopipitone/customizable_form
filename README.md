# Customizable Form Plugin

Customizable Form is a Kibana plugin that delivers “form-based” visualizations to collect user input and trigger Kibana Action connectors. It ships with:

- **Form Builder** with live preview, info/summary panel, and configuration tabs (general, fields, connectors, payloads).
- **Embeddable** panel for dashboards/library items that reuses saved configuration and executes the configured connectors.
- **Refactor-friendly architecture** built on composable hooks, shared context, and reusable services (`public/services`, `common`).

This document explains the architecture, development workflow, functional usage, and supporting references.

---

## 1. Overview & Architecture

### 1.1 High-level summary
- Supports Kibana `9.1.5` and requires core plugins such as `embeddable`, `visualizations`, `presentationUtil`, `triggersActionsUi`, etc.
- Goal: create, save, and reuse interactive forms that route submissions to multiple connector types (`.index`, `.webhook`, `.email`, `.jira`, `.teams`).
- For connectors that require structured parameters (email/Jira/Teams), the payload template must render a JSON object matching the connector `params` schema.
- Key capabilities: variable validation, per-connector payload templates, optional confirmation modal before executing connectors.

### 1.2 Architecture map
| Area | Path | Notes |
|------|------|-------|
| **UI Builder** | `public/components/form_builder` | Three-column layout plus dedicated configuration tabs. |
| **Hooks** | `public/components/form_builder/hooks` | `use_form_builder_lifecycle` composes state; derived hooks cover validation, payloads, connector state, execution. |
| **Context** | `form_builder_context.tsx` | `FormBuilderProvider` shares `formConfig`, derived state, and mutation handlers down the tree. |
| **Utils** | `public/components/form_builder/utils` | Serialization, payload helpers, connector summary builders, common constants. |
| **Services** | `public/services/*` | Persistence, library client, embeddable state transfer, core service access. |
| **Embeddable** | `public/embeddable` | `customizable_form_embeddable.tsx` renders preview in dashboards and runs connectors. |
| **Server** | `server/*` | Plugin registration, saved object definition, manifest. |
| **Common** | `common/*` | Shared types and content-management helpers. |

```
+-------------------+        +-----------------------+        +----------------------+
| Form Builder UI   | -----> | Form Builder Hooks    | -----> | Services (persistence|
| (preview/info/tabs)|       | (state, validation,   |        | connectors, library) |
+-------------------+        | payload, execution)   |        +----------------------+
          |                           |                                  |
          v                           v                                  v
   FormBuilderContext --------> Derived State -----------> Embeddable (dashboards)
```

### 1.3 Builder lifecycle
1. **`CustomizableFormBuilder`** seeds default config + saved-object attributes and invokes `useFormBuilderLifecycle`.
2. **`useFormBuilderLifecycle`**
   - Fetches connector types/list via `useConnectorsData`.
   - Owns CRUD over `formConfig` and field values via `useFormConfigState`.
   - Derives validation (`useFieldValidation`), payload previews (`usePayloadTemplates`), and connector summaries (`useConnectorState`).
   - Coordinates save flows (persistence services) and submits/test executions (`useConnectorExecution`).
3. **`FormBuilderLayout`** receives pure props and renders the three main panels: `PreviewCard`, `InfoPanel`, `ConfigurationPanel`.
4. **Context** ensures every nested component uses `useFormBuilderContext` instead of prop drilling.

### 1.4 Embeddable flow
1. `customizable_form_embeddable.tsx` receives `CustomizableFormEmbeddableSerializedState`.
2. Resolves the saved object through `resolveCustomizableForm` (persistence service).
3. Uses `usePayloadTemplates` to render payloads from stored template + current field values.
4. Reuses `useConnectorExecution` for shared submit logic and optional confirmation modal.

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

### B. Services & API reference
- `public/services/persistence.ts` — `createCustomizableForm`, `updateCustomizableForm`, `resolveCustomizableForm`, `getDocumentFromResolveResponse`.
- `public/services/library_client.ts` — helper around Content Management CRUD operations.
- `public/services/embeddable_state_transfer.ts` — transfers state between apps/dashboards.
- `public/services/core_services.ts` — centralized accessors for Kibana core services (toasts, overlays, application navigation).
- `public/components/form_builder/use_connectors_data.ts` — encapsulated HTTP fetch for connector types/list with toast reporting (see examples in §2.5).

---
