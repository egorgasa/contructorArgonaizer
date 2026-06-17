import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { isAdminProtectionEnabled } from "@/lib/admin-auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { next?: string; error?: string };
}

export default function AdminLoginPage({ searchParams }: PageProps) {
  const enabled = isAdminProtectionEnabled();

  return (
    <div className="mx-auto mt-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Вход для оператора</CardTitle>
        </CardHeader>
        <CardBody>
          {enabled ? (
            <AdminLoginForm
              next={searchParams.next ?? "/admin"}
              initialError={searchParams.error}
            />
          ) : (
            <div className="text-sm text-gray-700">
              <p>
                Защита админки сейчас выключена (переменная <code>ADMIN_PASSWORD</code>{" "}
                не задана). Можно зайти на <Link className="text-brand-600 hover:underline" href="/admin">страницу заявок</Link>{" "}
                напрямую.
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
