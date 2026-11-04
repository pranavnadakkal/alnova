'use server'

import { Account, Client, Query } from 'node-appwrite'
import { cookies } from 'next/headers'
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server'

const roleLabels = new Set(['student', 'alumni', 'teacher'])

export async function persistAppwriteSession(sessionSecret: string) {
  if (!sessionSecret || sessionSecret.length > 512) {
    throw new Error('Invalid Appwrite session.')
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setSession(sessionSecret)
  const account = new Account(client)
  await account.get()
  const session = await account.getSession('current')

  const cookieStore = await cookies()
  cookieStore.set('appwrite-session', sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expire),
  })
}

export async function clearAppwriteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('appwrite-session')
}

export async function syncRoleLabel() {
  const sessionClient = await createSessionClient()
  const user = await sessionClient.account.get()
  const profiles = await sessionClient.tablesDB.listRows(
    process.env.NEXT_PUBLIC_DATABASE_ID!,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  const role = profiles.rows[0]?.role
  if (typeof role !== 'string' || (!roleLabels.has(role) && role !== 'admin')) {
    throw new Error('Your account profile has an unsupported role.')
  }

  const adminClient = createAdminClient()
  const adminUser = await adminClient.users.get(user.$id)
  const labels = new Set(adminUser.labels.filter((label) => !roleLabels.has(label)))
  if (roleLabels.has(role)) labels.add(role)
  await adminClient.users.updateLabels({ userId: user.$id, labels: [...labels] })
}
