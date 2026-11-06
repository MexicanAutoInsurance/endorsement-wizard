import ClientApp from "@/components/ClientApp";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClientApp token={token} />;
}
