import { supabase } from "./supabase";

export async function createMember({
  name,
  phone,
  role,
  adminId,
}: {
  name: string;
  phone: string;
  role: string;
  adminId: string;
}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        phone,
        role,
        admin_id: adminId,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to create member");
  }

  return data;
}
