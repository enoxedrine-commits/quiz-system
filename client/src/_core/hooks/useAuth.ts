import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

const AUTH_BYPASS = true;

const bypassUser = {
  id: 1,
  openId: "auth-bypass-open-id",
  name: "Admin User",
  email: "admin@local.test",
  loginMethod: "auth-bypass",
  role: "admin",
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const redirectOnUnauthenticated =
    options?.redirectOnUnauthenticated ?? false;
  const redirectPath = options?.redirectPath ?? "/login";
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !AUTH_BYPASS,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    if (AUTH_BYPASS) return;

    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const user = AUTH_BYPASS ? bypassUser : meQuery.data ?? null;

  const state = useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    }

    return {
      user,
      loading: !AUTH_BYPASS && (meQuery.isLoading || logoutMutation.isPending),
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: AUTH_BYPASS || Boolean(user),
    };
  }, [
    user,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (AUTH_BYPASS) return;
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    meQuery.isLoading,
    logoutMutation.isPending,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
