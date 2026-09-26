import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/mes";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useRole() {
  const { session, loading } = useSession();
  const userId = session?.user.id;

  const { data, isLoading } = useQuery({
    queryKey: ["role", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as Role);
      if (roles.includes("admin")) return "admin" as Role;
      if (roles.includes("leader")) return "leader" as Role;
      return "operator" as Role;
    },
  });

  const role = data ?? null;
  return {
    session,
    userId,
    role,
    isManager: role === "admin" || role === "leader",
    isAdmin: role === "admin",
    loading: loading || isLoading,
  };
}
