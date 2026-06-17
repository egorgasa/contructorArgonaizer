import { sortFields } from "../../lib/sortFields";
import type { FormSchema } from "../../types/schema";
import type { FormSubmission } from "../../types/submission";
import { PrintFieldRenderer } from "./PrintFieldRenderer";

interface PrintableSubmissionViewProps {
  schema: FormSchema;
  submission: FormSubmission;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function PrintableSubmissionView({ schema, submission }: PrintableSubmissionViewProps) {
  const title = schema.settings.printTitle ?? schema.title ?? "Untitled form";
  const fields = sortFields(schema.fields);

  return (
    <article className="print-page" aria-label="Printable submission">
      <header className="print-avoid-break" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{title}</h1>
        {schema.description ? (
          <p className="print-meta" style={{ marginTop: 4 }}>
            {schema.description}
          </p>
        ) : null}
        <p className="print-meta" style={{ marginTop: 8 }}>
          Submitted: {formatDate(submission.createdAt)} · Form v{submission.formVersion}
          {" · "}#{submission.id}
        </p>
        <hr className="print-divider" />
      </header>

      <section>
        {fields.map((field) => (
          <PrintFieldRenderer key={field.id} field={field} values={submission.values} />
        ))}
      </section>
    </article>
  );
}
