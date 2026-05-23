import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials'
import { retrieveAccount } from '@convex-dev/auth/server'
import { Scrypt } from 'lucia'

function normalizeEmail(email: unknown) {
  if (typeof email !== 'string' || email.trim() === '') {
    throw new Error('Email is required')
  }
  return email.trim().toLowerCase()
}

function requirePassword(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password is required')
  }
  return password
}

export const AdminPassword = ConvexCredentials({
  id: 'password',
  authorize: async (params, ctx) => {
    const flow = params.flow
    if (flow !== undefined && flow !== 'signIn') {
      throw new Error('Accounts can only be created by an administrator')
    }

    const email = normalizeEmail(params.email)
    const password = requirePassword(params.password)
    const result = await retrieveAccount(ctx, {
      provider: 'password',
      account: { id: email, secret: password },
    })

    if (result.user.disabled) {
      throw new Error('This account is disabled')
    }

    return { userId: result.user._id }
  },
  crypto: {
    async hashSecret(password: string) {
      return await new Scrypt().hash(password)
    },
    async verifySecret(password: string, hash: string) {
      return await new Scrypt().verify(hash, password)
    },
  },
})
