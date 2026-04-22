import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/CheckoutClient";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/checkout");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>
      <CheckoutClient />
    </div>
  );
}
