'use server'

import { ID, Query } from 'node-appwrite'
import { z } from 'zod'
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server'

const userIdSchema = z.string().min(1).max(36)
const messageSchema = z.object({
  conversationId: z.string().min(1).max(36),
  content: z.string().trim().min(1).max(4000),
})

export async function getOrCreateConversation(otherUserIdInput: string) {
  const otherUserId = userIdSchema.parse(otherUserIdInput)
  const sessionClient = await createSessionClient()
  const currentUser = await sessionClient.account.get()
  if (currentUser.$id === otherUserId) {
    throw new Error('You cannot start a conversation with yourself.')
  }

  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
  const adminClient = createAdminClient()
  const [currentProfiles, otherProfiles] = await Promise.all([
    sessionClient.tablesDB.listRows(
      databaseId,
      'profiles',
      [Query.equal('userId', currentUser.$id)],
    ),
    adminClient.tablesDB.listRows(
      databaseId,
      'profiles',
      [Query.equal('userId', otherUserId)],
    ),
  ])
  const currentRole = currentProfiles.rows[0]?.role
  const otherRole = otherProfiles.rows[0]?.role

  if (
    !((currentRole === 'student' && otherRole === 'alumni')
      || (currentRole === 'alumni' && otherRole === 'student'))
  ) {
    throw new Error('Conversations are only available between students and alumni.')
  }

  const studentId = currentRole === 'student' ? currentUser.$id : otherUserId
  const alumniId = currentRole === 'alumni' ? currentUser.$id : otherUserId
  const [requests, sessions] = await Promise.all([
    adminClient.tablesDB.listRows(
      databaseId,
      'requests',
      [
        Query.equal('studentId', studentId),
        Query.equal('alumniId', alumniId),
        Query.limit(1),
      ],
    ),
    adminClient.tablesDB.listRows(
      databaseId,
      'mentorship_sessions',
      [
        Query.equal('studentId', studentId),
        Query.equal('alumniId', alumniId),
        Query.limit(1),
      ],
    ),
  ])
  if (requests.rows.length === 0 && sessions.rows.length === 0) {
    throw new Error('You can only message a student or alumni you are connected with.')
  }

  const existing = await adminClient.tablesDB.listRows(
    databaseId,
    'conversations',
    [
      Query.equal('studentId', studentId),
      Query.equal('alumniId', alumniId),
      Query.limit(1),
    ],
  )

  if (existing.rows[0]) return existing.rows[0].$id

  const conversation = await adminClient.tablesDB.createRow(
    databaseId,
    'conversations',
    ID.unique(),
    { studentId, alumniId },
  )
  return conversation.$id
}

export async function sendChatMessage(input: {
  conversationId: string
  content: string
}) {
  const { conversationId, content } = messageSchema.parse(input)
  const sessionClient = await createSessionClient()
  const currentUser = await sessionClient.account.get()
  const adminClient = createAdminClient()
  const conversations = await adminClient.tablesDB.listRows(
    process.env.NEXT_PUBLIC_DATABASE_ID!,
    'conversations',
    [Query.equal('$id', conversationId), Query.limit(1)],
  )
  const conversation = conversations.rows[0]

  if (!conversation || ![conversation.studentId, conversation.alumniId].includes(currentUser.$id)) {
    throw new Error('You are not a participant in this conversation.')
  }

  const message = await adminClient.tablesDB.createRow(
    process.env.NEXT_PUBLIC_DATABASE_ID!,
    'messages',
    ID.unique(),
    {
      conversationId,
      senderId: currentUser.$id,
      studentId: conversation.studentId,
      alumniId: conversation.alumniId,
      content,
    },
  )
  return {
    $id: message.$id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    $createdAt: message.$createdAt,
  }
}
