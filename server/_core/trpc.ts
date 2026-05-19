// import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
// import { initTRPC, TRPCError } from "@trpc/server";
// import superjson from "superjson";
// import type { TrpcContext } from "./context";

// const t = initTRPC.context<TrpcContext>().create({
//   transformer: superjson,
// });

// export const router = t.router;
// export const publicProcedure = t.procedure;

// const requireUser = t.middleware(async opts => {
//   const { ctx, next } = opts;

//   if (!ctx.user) {
//     throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
//   }

//   return next({
//     ctx: {
//       ...ctx,
//       user: ctx.user,
//     },
//   });
// });

// export const protectedProcedure = t.procedure.use(requireUser);

// export const adminProcedure = t.procedure.use(
//   t.middleware(async opts => {
//     const { ctx, next } = opts;

//     if (!ctx.user || ctx.user.role !== 'admin') {
//       throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
//     }

//     return next({
//       ctx: {
//         ...ctx,
//         user: ctx.user,
//       },
//     });
//   }),
// );





import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const IS_DEV_BYPASS = true;

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * ======================================
 * 🔥 DEV USER (MATCHES DB TYPE EXACTLY)
 * ======================================
 */
const createDevUser = (): TrpcContext["user"] => ({
  id: 1,
  openId: "dev-open-id",
  name: "Dev User",
  email: "dev@local.com",
  loginMethod: "dev",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

/**
 * ======================================
 * AUTH MIDDLEWARE
 * ======================================
 */
const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  // 🔥 DEV BYPASS
  if (IS_DEV_BYPASS && !ctx.user) {
    ctx.user = createDevUser();
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * ======================================
 * ADMIN MIDDLEWARE
 * ======================================
 */
export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    // 🔥 DEV BYPASS ALWAYS ADMIN
    if (IS_DEV_BYPASS) {
      ctx.user = createDevUser();
    }

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);