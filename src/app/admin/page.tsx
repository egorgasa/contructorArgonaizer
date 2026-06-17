import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PRODUCT_TYPES } from "@/lib/constants";
import { RequestStatusBadge } from "@/components/admin/RequestStatusBadge";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { isAdminProtectionEnabled } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Заявки — Админка",
};

export default async function AdminListPage() {
  const requests = await prisma.printRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      publicNumber: true,
      status: true,
      productType: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заявки</h1>
          <p className="text-sm text-gray-600">
            Всего: {requests.length}. Сортировка по дате создания.
          </p>
        </div>
        <AdminLogoutButton enabled={isAdminProtectionEnabled()} />
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <div className="text-base font-medium text-gray-700">Заявок пока нет</div>
          <div className="mt-1 text-sm text-gray-500">
            Создайте тестовую заявку через{" "}
            <Link href="/constructor" className="text-brand-600 hover:underline">
              конструктор
            </Link>
            .
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">№</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Клиент</th>
                  <th className="px-4 py-3">Контакты</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {r.publicNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{productLabel(r.productType)}</td>
                    <td className="px-4 py-3 text-gray-900">{r.clientName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.clientEmail && <div>{r.clientEmail}</div>}
                      {r.clientPhone && <div>{r.clientPhone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function productLabel(value: string): string {
  return PRODUCT_TYPES.find((p) => p.value === value)?.label ?? value;
}
