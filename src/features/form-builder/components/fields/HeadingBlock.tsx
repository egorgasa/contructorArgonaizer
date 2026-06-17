"use client";

import { createElement } from "react";
import type { HeadingField } from "../../types/field";

interface Props {
  field: HeadingField;
}

// `field.label` carries the heading text. Level defaults to 2.
// Layout (grid cell + width) is owned by FormRenderer; this component
// only renders the heading element itself.
export function HeadingBlock({ field }: Props) {
  const level = field.level ?? 2;
  const sizeClass =
    level === 1 ? "text-2xl" : level === 2 ? "text-xl" : "text-base";
  const tag = `h${level}` as "h1" | "h2" | "h3";
  return createElement(
    tag,
    { className: `${sizeClass} font-semibold text-gray-900` },
    field.label,
  );
}
