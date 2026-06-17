import Link from "next/link";
import { notFound } from "next/navigation";
import type { OperatorNote, RequestFile, RequestQuote, StatusHistory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REQUEST_STATUSES } from "@/lib/constants";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { RequestStatusBadge } from "@/components/admin/RequestStatusBadge";
import { ConstructorRequestDetail } from "@/components/constructor/ConstructorRequestDetail";
import { StatusChanger } from "@/components/admin/StatusChanger";
import { QuoteEditor } from "@/components/admin/QuoteEditor";
import { OperatorNotes } from "@/components/admin/OperatorNotes";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { isAdminProtectionEnabled } from "@/lib/admin-auth";
import type { PrintRequestData } from "@/lib/validations/print-request";
import type { PrintRequestDetail, StoredRequestQuote } from "@/types/print-request";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function AdminRequestDetailPage({ params }: PageProps) {
  const request = await prisma.printRequest.findUnique({
    where: { id: params.id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { uploadedAt: "asc" } },
      quotes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!request) notFound();

  const quoteRow: RequestQuote | undefined = request.quotes[0];
  const quote: StoredRequestQuote | null = quoteRow
    ? {
        id: quoteRow.id,
        requestId: quoteRow.requestId,
        priceCents: quoteRow.priceCents,
        currency: quoteRow.currency,
        productionDays: quoteRow.productionDays,
        validUntil: quoteRow.validUntil ? quoteRow.validUntil.toISOString() : null,
        operatorComment: quoteRow.operatorComment,
        internalCostNote: quoteRow.internalCostNote,
        status: quoteRow.status,
        createdAt: quoteRow.createdAt.toISOString(),
        updatedAt: quoteRow.updatedAt.toISOString(),
      }
    : null;

  let payload: PrintRequestData | null = null;
  try {
    payload = JSON.parse(request.payload) as PrintRequestData;
  } catch {
    payload = null;
  }

  const detail: PrintRequestDetail | null = payload
    ? {
        id: request.id,
        publicNumber: request.publicNumber,
        status: request.status,
        productType: request.productType,
        clientName: request.clientName,
        clientEmail: request.clientEmail,
        clientPhone: request.clientPhone,
        payload,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        notes: request.notes.map((n: OperatorNote) => ({
          id: n.id,
          requestId: n.requestId,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        })),
        statusHistory: request.statusHistory.map((s: StatusHistory) => ({
          id: s.id,
          requestId: s.requestId,
          fromStatus: s.fromStatus,
          toStatus: s.toStatus,
          reason: s.reason,
          createdAt: s.createdAt.toISOString(),
        })),
        files: request.files.map((f: RequestFile) => ({
          id: f.id,
          requestId: f.requestId,
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          uploadedAt: f.uploadedAt.toISOString(),
        })),
      }
    : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">
          ← К списку заявок
        </Link>
        <AdminLogoutButton enabled={isAdminProtectionEnabled()} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-wide text-gray-500">
            {request.publicNumber}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Заявка от {request.clientName}
          </h1>
          <div className="mt-1 text-xs text-gray-500">
            Создана {new Date(request.createdAt).toLocaleString()}
          </div>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {detail ? (
            <ConstructorRequestDetail detail={detail} />
          ) : (
            <Card>
              <CardBody className="text-sm text-red-700">
                Не удалось распарсить payload заявки.
              </CardBody>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <StatusChanger requestId={request.id} currentStatus={request.status} />

          <QuoteEditor requestId={request.id} quote={quote} />

          <OperatorNotes
            requestId={request.id}
            notes={request.notes.map((n: OperatorNote) => ({
              id: n.id,
              requestId: n.requestId,
              body: n.body,
              createdAt: n.createdAt.toISOString(),
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle>История статусов</CardTitle>
            </CardHeader>
            <CardBody>
              {request.statusHistory.length === 0 ? (
                <div className="text-sm text-gray-500">История пуста</div>
              ) : (
                <ol className="space-y-2 text-sm">
                  {request.statusHistory.map((s: StatusHistory) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-gray-700">
                        {s.fromStatus ? (
                          <>
                            <RequestStatusBadge status={s.fromStatus} />
                            <span>→</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">создана →</span>
                        )}
                        <RequestStatusBadge status={s.toStatus} />
                      </div>
                      {s.reason && (
                        <div className="mt-1 text-xs text-gray-600">{s.reason}</div>
                      )}
                      <div className="mt-1 text-[11px] text-gray-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      {/* Доступные статусы — справка для оператора */}
      <details className="mt-8 rounded-xl border border-gray-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer text-gray-700">Возможные статусы</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {REQUEST_STATUSES.map((s) => (
            <RequestStatusBadge key={s.value} status={s.value} />
          ))}
        </div>
      </details>
    </div>
  );
}
