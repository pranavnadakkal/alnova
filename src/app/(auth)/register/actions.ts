'use server'

import { ID } from 'node-appwrite'
import { z } from 'zod'
import { createAdminClient } from '@/lib/appwrite/server'

const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function registerUser(input: { email: string; password: string }) {
  const { email, password } = registrationSchema.parse(input)
  const fullName = email.split('@')[0]
  const adminClient = createAdminClient()
  const user = await adminClient.users.create(ID.unique(), email, undefined, password, fullName)

  try {
    await adminClient.tablesDB.createRow(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      'profiles',
      ID.unique(),
      {
        userId: user.$id,
        role: 'pending',
        fullName,
      },
    )
  } catch (error) {
    try {
      await adminClient.users.delete(user.$id)
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Profile creation failed and the new Appwrite user could not be removed.',
      )
    }
    throw error
  }
}
