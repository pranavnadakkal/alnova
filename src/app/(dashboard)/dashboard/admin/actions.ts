'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server'
import { ID, Query } from 'node-appwrite'

export async function verifyAlumni(alumniProfileDocumentId: string, profileId: string) {
  let sessionClient
  try {
    sessionClient = await createSessionClient()
  } catch {
    throw new Error('You must be signed in.')
  }
  const user = await sessionClient.account.get()
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
  const adminProfiles = await sessionClient.tablesDB.listRows(
    databaseId,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  if (adminProfiles.rows[0]?.role !== 'admin') {
    throw new Error('Only administrators can verify alumni.')
  }

  const adminClient = createAdminClient()
  await adminClient.tablesDB.updateRow(
    databaseId,
    'alumni_profiles',
    alumniProfileDocumentId,
    { isVerified: true },
  )
  await adminClient.tablesDB.createRow(
    databaseId,
    'notifications',
    ID.unique(),
    {
      userId: profileId,
      type: 'alumni_verified',
      content: 'Your alumni profile has been verified.',
      link: '/profile',
      isRead: false,
    },
  )

  revalidatePath('/dashboard/admin')
  revalidatePath('/directory')
}
