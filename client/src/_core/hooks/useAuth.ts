// import { getLoginUrl } from "@/const";
// import { trpc } from "@/lib/trpc";
// import { TRPCClientError } from "@trpc/client";
// import { useCallback, useEffect, useMemo } from "react";

// type UseAuthOptions = {
//   redirectOnUnauthenticated?: boolean;
//   redirectPath?: string;
// };

// export function useAuth(options?: UseAuthOptions) {
//   const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
//     options ?? {};
//   const utils = trpc.useUtils();

//   const meQuery = trpc.auth.me.useQuery(undefined, {
//     retry: false,
//     refetchOnWindowFocus: false,
//   });

//   const logoutMutation = trpc.auth.logout.useMutation({
//     onSuccess: () => {
//       utils.auth.me.setData(undefined, null);
//     },
//   });

//   const logout = useCallback(async () => {
//     try {
//       await logoutMutation.mutateAsync();
//     } catch (error: unknown) {
//       if (
//         error instanceof TRPCClientError &&
//         error.data?.code === "UNAUTHORIZED"
//       ) {
//         return;
//       }
//       throw error;
//     } finally {
//       utils.auth.me.setData(undefined, null);
//       await utils.auth.me.invalidate();
//     }
//   }, [logoutMutation, utils]);

//   const state = useMemo(() => {
//     localStorage.setItem(
//       "manus-runtime-user-info",
//       JSON.stringify(meQuery.data)
//     );
//     return {
//       user: meQuery.data ?? null,
//       loading: meQuery.isLoading || logoutMutation.isPending,
//       error: meQuery.error ?? logoutMutation.error ?? null,
//       isAuthenticated: Boolean(meQuery.data),
//     };
//   }, [
//     meQuery.data,
//     meQuery.error,
//     meQuery.isLoading,
//     logoutMutation.error,
//     logoutMutation.isPending,
//   ]);

//   useEffect(() => {
//     if (!redirectOnUnauthenticated) return;
//     if (meQuery.isLoading || logoutMutation.isPending) return;
//     if (state.user) return;
//     if (typeof window === "undefined") return;
//     if (window.location.pathname === redirectPath) return;

//     window.location.href = redirectPath
//   }, [
//     redirectOnUnauthenticated,
//     redirectPath,
//     logoutMutation.isPending,
//     meQuery.isLoading,
//     state.user,
//   ]);

//   return {
//     ...state,
//     refresh: () => meQuery.refetch(),
//     logout,
//   };
// }




import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

/**
 * 🔥 DEV MODE SWITCH
 * Set to true to completely bypass login
 */
const AUTH_BYPASS = true;

const devUser = {
  id: "dev-user",
  name: "Dev User",
  email: "dev@local.com",
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string; // optional now, safe default inside
};

export function useAuth(options?: UseAuthOptions) {
  const redirectOnUnauthenticated =
    options?.redirectOnUnauthenticated ?? false;

  const redirectPath = options?.redirectPath ?? "/login";

  const utils = trpc.useUtils();

  /**
   * =========================
   * AUTH QUERY (REAL OR MOCK)
   * =========================
   */
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !AUTH_BYPASS, // 🔥 disable API call in dev mode
  });

  /**
   * =========================
   * LOGOUT MUTATION
   * =========================
   */
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

  /**
   * =========================
   * USER STATE (UNIFIED)
   * =========================
   */
  const user = AUTH_BYPASS ? devUser : meQuery.data ?? null;

  const state = useMemo(() => {
    // optional debug persistence
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(user)
      );
    }

    return {
      user,
      loading:
        !AUTH_BYPASS &&
        (meQuery.isLoading || logoutMutation.isPending),
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: true, // always true in dev bypass
    };
  }, [
    user,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  /**
   * =========================
   * REDIRECT LOGIC
   * =========================
   */
  useEffect(() => {
    if (AUTH_BYPASS) return;
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    const currentPath = window.location.pathname;

    if (currentPath === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    meQuery.isLoading,
    logoutMutation.isPending,
    state.user,
  ]);

  /**
   * =========================
   * RETURN API
   * =========================
   */
  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}