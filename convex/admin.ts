import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server'
import { createAccount, getAuthUserId, invalidateSessions, modifyAccountCredentials } from '@convex-dev/auth/server'

const role = v.union(v.literal('admin'), v.literal('user'))

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function currentUserId(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx)
  if (userId === null) {
    throw new Error('Not authenticated')
  }
  return userId
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await currentUserId(ctx)
  const user = await ctx.db.get(userId)
  if (!user || user.role !== 'admin' || user.disabled) {
    throw new Error('Admin access required')
  }
  return user
}

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx)
    const user = await ctx.db.get(userId)
    if (!user) return null
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      disabled: user.disabled ?? false,
    }
  },
})

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const users = await ctx.db.query('users').collect()
    return users
      .sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''))
      .map((user) => ({
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        disabled: user.disabled ?? false,
        createdAt: user._creationTime,
      }))
  },
})

export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    email: v.string(),
    name: v.optional(v.string()),
    role,
    disabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    const email = normalizeEmail(args.email)
    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error('User not found')

    if (admin._id === args.userId && (args.role !== 'admin' || args.disabled)) {
      throw new Error('You cannot remove your own admin access')
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', email))
      .unique()
    if (existing && existing._id !== args.userId) {
      throw new Error('Email already exists')
    }

    await ctx.db.patch(args.userId, {
      email,
      name: args.name?.trim() || undefined,
      role: args.role,
      disabled: args.disabled,
    })

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', args.userId).eq('provider', 'password'))
      .collect()
    for (const account of accounts) {
      await ctx.db.patch(account._id, { providerAccountId: email })
    }
  },
})

export const removeUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx)
    if (admin._id === args.userId) {
      throw new Error('You cannot delete your own account')
    }

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', args.userId).eq('provider', 'password'))
      .collect()
    for (const account of accounts) {
      const codes = await ctx.db
        .query('authVerificationCodes')
        .withIndex('accountId', (q) => q.eq('accountId', account._id))
        .collect()
      for (const code of codes) await ctx.db.delete(code._id)
      await ctx.db.delete(account._id)
    }

    const sessions = await ctx.db.query('authSessions').withIndex('userId', (q) => q.eq('userId', args.userId)).collect()
    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query('authRefreshTokens')
        .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
        .collect()
      for (const token of refreshTokens) await ctx.db.delete(token._id)
      await ctx.db.delete(session._id)
    }

    await ctx.db.delete(args.userId)
  },
})

export const getUserForAction = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const setUserAfterCreate = internalMutation({
  args: {
    userId: v.id('users'),
    role,
    disabled: v.boolean(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      role: args.role,
      disabled: args.disabled,
      name: args.name,
    })
  },
})

export const ensureAdminForAction = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    return Boolean(user && user.role === 'admin' && !user.disabled)
  },
})

async function requireAdminAction(ctx: ActionCtx) {
  const userId = await currentUserId(ctx)
  const isAdmin = await ctx.runQuery(internal.admin.ensureAdminForAction, { userId })
  if (!isAdmin) {
    throw new Error('Admin access required')
  }
  return userId
}

export const createUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    role,
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx)
    const email = normalizeEmail(args.email)
    const created = await createAccount(ctx, {
      provider: 'password',
      account: { id: email, secret: args.password },
      profile: {
        email,
        name: args.name?.trim() || undefined,
        role: args.role,
        disabled: false,
      },
    })
    return created.user._id
  },
})

export const changeUserPassword = action({
  args: {
    userId: v.id('users'),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx)
    const user = await ctx.runQuery(internal.admin.getUserForAction, { userId: args.userId })
    if (!user?.email) throw new Error('User email is missing')
    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: { id: user.email, secret: args.password },
    })
    await invalidateSessions(ctx, { userId: args.userId })
  },
})
