import { createElement, type ComponentType, type ReactElement } from "react";
import type { FieldByType, FormFieldType } from "../types/field";
import type { FieldValue, ImageFieldValue } from "../types/submission";
import { TextField } from "./fields/TextField";
import { TextareaField } from "./fields/TextareaField";
import { NumberField } from "./fields/NumberField";
import { CheckboxField } from "./fields/CheckboxField";
import { SelectField } from "./fields/SelectField";
import { DateField } from "./fields/DateField";
import { RadioField } from "./fields/RadioField";
import { ImageField } from "./fields/ImageField";
import { ColorField } from "./fields/ColorField";
import { StaticTextBlock } from "./fields/StaticTextBlock";
import { HeadingBlock } from "./fields/HeadingBlock";
import { DividerBlock } from "./fields/DividerBlock";

// Renderer registry — UI-layer counterpart of `lib/fieldMeta`. This module
// is the only place React is allowed to live for per-field-type dispatch.
//
// Each adapter narrows FieldValue to the strict shape its concrete field
// component expects and widens emitted values back to FieldValue. Explicit
// per-type adapters avoid generic-contravariance issues and keep the
// individual field components strict.

export interface RendererProps<T extends FormFieldType> {
  field: FieldByType<T>;
  value: FieldValue;
  error?: string;
  onChange: (value: FieldValue) => void;
}

function TextAdapter(props: RendererProps<"text">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "string" ? value : value == null ? value : String(value);
  return createElement(TextField, { field, value: v, error, onChange });
}

function TextareaAdapter(props: RendererProps<"textarea">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "string" ? value : value == null ? value : String(value);
  return createElement(TextareaField, { field, value: v, error, onChange });
}

function NumberAdapter(props: RendererProps<"number">): ReactElement {
  const { field, value, error, onChange } = props;
  let v: number | null | undefined;
  if (value === null || value === undefined) v = value;
  else if (typeof value === "number") v = value;
  else if (typeof value === "string" && value !== "") {
    const n = Number(value);
    v = Number.isNaN(n) ? null : n;
  } else v = null;
  return createElement(NumberField, { field, value: v, error, onChange });
}

function CheckboxAdapter(props: RendererProps<"checkbox">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "boolean" ? value : Boolean(value);
  return createElement(CheckboxField, { field, value: v, error, onChange });
}

function SelectAdapter(props: RendererProps<"select">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "string" ? value : value == null ? value : String(value);
  return createElement(SelectField, { field, value: v, error, onChange });
}

function DateAdapter(props: RendererProps<"date">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "string" ? value : value == null ? value : String(value);
  return createElement(DateField, { field, value: v, error, onChange });
}

function RadioAdapter(props: RendererProps<"radio">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "string" ? value : value == null ? value : String(value);
  return createElement(RadioField, { field, value: v, error, onChange });
}

function isImageValue(v: FieldValue): v is ImageFieldValue {
  return typeof v === "object" && v !== null && "kind" in v && v.kind === "image";
}

function ImageAdapter(props: RendererProps<"image">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = isImageValue(value) ? value : value == null ? value : null;
  return createElement(ImageField, { field, value: v, error, onChange });
}

function ColorAdapter(props: RendererProps<"color">): ReactElement {
  const { field, value, error, onChange } = props;
  const v = typeof value === "string" ? value : value == null ? value : String(value);
  return createElement(ColorField, { field, value: v, error, onChange });
}

// Display-only adapters: ignore `value`, never call `onChange`.
function StaticTextAdapter(props: RendererProps<"staticText">): ReactElement {
  return createElement(StaticTextBlock, { field: props.field });
}

function HeadingAdapter(props: RendererProps<"heading">): ReactElement {
  return createElement(HeadingBlock, { field: props.field });
}

function DividerAdapter(props: RendererProps<"divider">): ReactElement {
  return createElement(DividerBlock, { field: props.field });
}

// One renderer per FormFieldType. The mapped type ensures that adding a
// new variant to FormFieldType forces an entry here at compile time.
export const FIELD_RENDERERS: {
  [T in FormFieldType]: ComponentType<RendererProps<T>>;
} = {
  text: TextAdapter,
  textarea: TextareaAdapter,
  number: NumberAdapter,
  checkbox: CheckboxAdapter,
  select: SelectAdapter,
  date: DateAdapter,
  radio: RadioAdapter,
  image: ImageAdapter,
  color: ColorAdapter,
  staticText: StaticTextAdapter,
  heading: HeadingAdapter,
  divider: DividerAdapter,
};
