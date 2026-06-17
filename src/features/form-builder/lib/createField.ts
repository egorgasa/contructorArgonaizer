import type {
  CheckboxField,
  ColorField,
  DateField,
  DividerField,
  FieldByType,
  FormFieldType,
  HeadingField,
  ImageField,
  NumberField,
  RadioField,
  SelectField,
  StaticTextField,
  TextField,
  TextareaField,
} from "../types/field";
import { generateId } from "./id";

// Each factory returns a typed default config for its field type.
// The functions are exported individually so the registry can reference
// them without a giant switch, and so future settings panels can call
// them directly.

export function createTextField(order: number): TextField {
  return {
    id: generateId("fld"),
    type: "text",
    label: "Text",
    placeholder: "",
    required: false,
    order,
    width: "full",
  };
}

export function createTextareaField(order: number): TextareaField {
  return {
    id: generateId("fld"),
    type: "textarea",
    label: "Textarea",
    placeholder: "",
    required: false,
    order,
    width: "full",
    rows: 3,
  };
}

export function createNumberField(order: number): NumberField {
  return {
    id: generateId("fld"),
    type: "number",
    label: "Number",
    placeholder: "",
    required: false,
    order,
    width: "full",
  };
}

export function createSelectField(order: number): SelectField {
  return {
    id: generateId("fld"),
    type: "select",
    label: "Select",
    required: false,
    order,
    width: "full",
    options: [
      { label: "Option 1", value: "option-1" },
      { label: "Option 2", value: "option-2" },
    ],
  };
}

export function createCheckboxField(order: number): CheckboxField {
  return {
    id: generateId("fld"),
    type: "checkbox",
    label: "Checkbox",
    required: false,
    order,
    width: "full",
    defaultChecked: false,
  };
}

export function createDateField(order: number): DateField {
  return {
    id: generateId("fld"),
    type: "date",
    label: "Date",
    required: false,
    order,
    width: "full",
  };
}

export function createRadioField(order: number): RadioField {
  return {
    id: generateId("fld"),
    type: "radio",
    label: "Radio group",
    required: false,
    order,
    width: "full",
    options: [
      { label: "Option 1", value: "option-1" },
      { label: "Option 2", value: "option-2" },
    ],
  };
}

export function createImageField(order: number): ImageField {
  return {
    id: generateId("fld"),
    type: "image",
    label: "Image",
    required: false,
    order,
    width: "full",
    accept: ["image/png", "image/jpeg", "image/webp"],
    maxSizeMb: 5,
  };
}

export function createColorField(order: number): ColorField {
  return {
    id: generateId("fld"),
    type: "color",
    label: "Color",
    required: false,
    order,
    width: "full",
  };
}

export function createStaticTextField(order: number): StaticTextField {
  return {
    id: generateId("fld"),
    type: "staticText",
    label: "Text block",
    order,
    width: "full",
    content: "Static text",
  };
}

export function createHeadingField(order: number): HeadingField {
  return {
    id: generateId("fld"),
    type: "heading",
    label: "Heading",
    order,
    width: "full",
    level: 2,
  };
}

export function createDividerField(order: number): DividerField {
  return {
    id: generateId("fld"),
    type: "divider",
    label: "Divider",
    order,
    width: "full",
  };
}

// Generic factory: useful for "add field by type" flows in the builder later.
// Implemented as a typed map to avoid a switch and to stay exhaustive.
const FIELD_FACTORIES: { [T in FormFieldType]: (order: number) => FieldByType<T> } = {
  text: createTextField,
  textarea: createTextareaField,
  number: createNumberField,
  select: createSelectField,
  checkbox: createCheckboxField,
  date: createDateField,
  radio: createRadioField,
  image: createImageField,
  color: createColorField,
  staticText: createStaticTextField,
  heading: createHeadingField,
  divider: createDividerField,
};

export function createField<T extends FormFieldType>(
  type: T,
  order: number,
): FieldByType<T> {
  return FIELD_FACTORIES[type](order);
}
