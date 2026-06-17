# Form Builder (MVP)

Schema-driven form constructor. Lets a user build forms with typed fields,
fill them, persist data, and print results. No backend — all persistence
goes through a `FormRepository` / `SubmissionRepository` abstraction with
a `localStorage` implementation.

## Layout

```
src/features/form-builder/
├── types/           pure domain model (no UI, no React)
│   ├── field.ts     FormField discriminated union, FormFieldPrintOptions
│   ├── schema.ts    FormSchema, FormSettings
│   └── submission.ts FormSubmission, FieldValue, ImageFieldValue, FieldErrors
├── lib/             pure helpers (no UI, no React)
│   ├── fieldMeta.ts   FIELD_META (label + isInput per type), PALETTE_ORDER
│   ├── createField.ts per-type factories + createField(type, order)
│   ├── createEmptyForm.ts
│   ├── sortFields.ts
│   ├── fieldCapabilities.ts  type guards (isDisplayBlock, hasOptions, …)
│   ├── validateSubmission.ts pure validators per type
│   ├── serializeForm.ts      JSON round-trip + structural guards
│   ├── serializeSubmission.ts
│   ├── exhaustive.ts         assertNever() helper
│   └── id.ts                 generateId(prefix)
├── repositories/    persistence interface + adapter(s)
│   ├── types.ts                       FormRepository, SubmissionRepository, *Meta
│   ├── localStorageFormRepository.ts
│   ├── localStorageSubmissionRepository.ts
│   └── index.ts                       singleton factories
├── hooks/
│   ├── useFormBuilder.ts    builder reducer
│   ├── useFormFill.ts       fill state + validation
│   ├── useSavedForms.ts     repo-backed list/save/remove
│   └── useSavedSubmissions.ts
├── components/
│   ├── registry.ts          FIELD_RENDERERS — UI dispatch per type
│   ├── FormRenderer.tsx     schema-driven layout (single/two column)
│   ├── FieldRenderer.tsx    runtime dispatcher
│   ├── fields/*             one component per field type
│   ├── builder/*            builder UI (palette, canvas, settings, header)
│   ├── fill/*               fill page
│   └── print/*              printable view, print button, print.css
└── ui/                      tiny widgets (Checkbox, FormItem, RadioGroup)
```

## Core types

- `FormSchema { id, title, description?, version, fields, settings, … }`
- `FormField` — discriminated union over 12 `type`s (text, textarea,
  number, select, checkbox, date, radio, image, color, staticText,
  heading, divider). Every field has `id`, `label`, `order`, optional
  `width`, `required`, `print?: { visible?, label? }`.
- `FormSubmission { id, formId, formVersion, values, createdAt, … }`
- `FieldValue = string | number | boolean | ImageFieldValue | null | undefined`.
  Image values are a tagged object so they round-trip through JSON.

## Adding a new field type

Adding a variant to `FormFieldType` triggers compile errors in every
place that needs an update — that is the design.

1. Add the variant to `FormFieldType` and a new interface to `FormField`
   in `types/field.ts`.
2. Add a factory to `lib/createField.ts` and register it in
   `FIELD_FACTORIES`.
3. Add an entry to `FIELD_META` in `lib/fieldMeta.ts` and to
   `PALETTE_ORDER` if you want it in the builder palette.
4. Build the input component under `components/fields/`.
5. Add an adapter + entry in `FIELD_RENDERERS` in `components/registry.ts`.
6. Add a branch to the switch in `lib/validateSubmission.ts`
   (`assertNever` will fail to compile until you do).
7. Add a branch to `components/builder/FieldSettingsPanel.tsx`
   (`assertNever` again).
8. Add a branch to `components/print/PrintFieldRenderer.tsx`.
9. Optional: extend `lib/serializeForm.ts` `isFieldShape` if the type
   has extra required structure (e.g. `options` for select/radio).

## Layering

- `types/` and `lib/` are React-free. They never import from
  `components/`, `hooks/`, or `repositories/`.
- `repositories/` is UI-free. SSR-safe: `localStorage` is touched only
  inside guarded helpers (`getStorage()` returns `null` on the server).
- `components/` may import from `types`, `lib`, `repositories`, `hooks`,
  but never the reverse.
- `FormRenderer` is schema-driven only — it knows nothing about builder,
  fill, persistence or print.

## Persistence

`FormRepository` and `SubmissionRepository` are interfaces. The current
implementation uses `localStorage` with per-entity keys plus an index
key, so listing is O(n) over metadata. Corrupted entries are filtered
on read and the index is rewritten. Cascading delete: removing a form
also removes its submissions.

To swap in a backend later, implement both interfaces and replace the
singletons in `repositories/index.ts`. UI does not change.

## Routes

```
/forms                                       list saved forms
/forms/new                                   create + redirect to builder
/forms/[formId]/builder                      edit + save
/forms/[formId]/fill                         fill + persist submission
/forms/[formId]/submissions                  per-form submissions list
/forms/[formId]/submissions/[id]/print       printable view + window.print()

/forms/demo                                  schema → renderer demo (no persistence)
/forms/builder-demo                          builder demo (no persistence)
/forms/fill-demo                             fill demo (no persistence)
```

All `/forms/*` route pages are client components because they touch the
repository (which uses `localStorage`). They never read storage during
render — all access is in `useEffect` with a cancellation flag.

## Print

`PrintableSubmissionView` is rendered on the print route, scoped by
`print.css` which is imported only by that route. Toolbar uses the
`no-print` class. `PrintButton` calls `window.print()` and is
client-guarded.

Field-level overrides:
- `field.print.visible === false` hides the field.
- `field.print.label` replaces the regular label in print only.

Form-level overrides:
- `settings.printTitle` replaces the title in print.

## MVP limitations

- No backend, no PDF export, no email, no auth, no sharing.
- Image uploads are stored as base64 dataURL inside the submission JSON
  — fine for MVP, won't scale.
- `localStorage` quota is finite. A failed save is surfaced as
  "Save failed" with a tooltip; there is no quota manager.
- No drag-and-drop (move up/down only).
- No conditional fields, no multi-page forms, no form version migrations.
- No CSV / JSON export of submissions (raw JSON is visible in the
  submissions list and printed view).
- No autosave — explicit Save button in the builder.

## Possible next steps

- Replace localStorage repositories with HTTP-backed implementations.
- Image upload via signed URLs, storing only references in the
  submission instead of dataURLs.
- Per-field duplicate action, drag-and-drop reorder.
- CSV export of submissions.
- Conditional visibility / required-if rules.
- Form versioning with migration on read.
