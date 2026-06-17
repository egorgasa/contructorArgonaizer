"use client";

import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import type { PrintRequestInput } from "@/lib/validations/print-request";
import { FileUploader, type PendingFile } from "./FileUploader";

interface ConstructorStepCommentProps {
  files: PendingFile[];
  onFilesChange: (next: PendingFile[]) => void;
  disabled?: boolean;
}

export function ConstructorStepComment({
  files,
  onFilesChange,
  disabled,
}: ConstructorStepCommentProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Комментарий и референсы</h2>
      <p className="mb-6 text-sm text-gray-600">
        Опишите изделие своими словами, приложите фото или эскизы. Чем больше деталей —
        тем точнее оператор подготовит модель.
      </p>

      <label className="mb-1 block text-sm font-medium text-gray-800">
        Комментарий оператору
      </label>
      <Textarea
        rows={4}
        placeholder="Например: похоже на ту картинку, что я найду, но с двумя секциями вместо трёх"
        invalid={!!errors.clientComment}
        {...register("clientComment")}
      />

      <label className="mt-5 mb-1 block text-sm font-medium text-gray-800">
        Описание референса
      </label>
      <Textarea
        rows={3}
        placeholder="Кратко опишите, как должно выглядеть изделие, если есть конкретный образ"
        invalid={!!errors.referenceDescription}
        {...register("referenceDescription")}
      />

      <label className="mt-5 mb-1 block text-sm font-medium text-gray-800">
        Ссылки на примеры (через запятую)
      </label>
      <Input
        type="text"
        placeholder="https://example.com/photo1, https://example.com/photo2"
        invalid={!!errors.optionalReferenceLinks}
        {...register("optionalReferenceLinks")}
      />

      <label className="mt-5 mb-1 block text-sm font-medium text-gray-800">
        Фото и эскизы (необязательно)
      </label>
      <FileUploader files={files} onChange={onFilesChange} disabled={disabled} />
    </div>
  );
}
