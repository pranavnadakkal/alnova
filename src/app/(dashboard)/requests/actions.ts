'use server'

import { revalidatePath } from 'next/cache'
import { ID, Query } from 'node-appwrite'
import { z } from 'zod'
import { createAdminClient, createSessionClient } from '@/lib/appwrite/server'

const requestStatusSchema = z.enum(['accepted', 'declined'])
const requestSchema = z.object({
  alumniId: z.string().min(1).max(36),
  topic: z.enum([
    'Career Transition & Growth',
    'Resume & Portfolio Deep-Dive',
    'Technical Architecture & Code Review',
    'Mock Technical Interview',
    'Mock Behavioral Interview',
    'Industry Insights & Day in the Life',
    'General Career Guidance',
  ]),
  pitch: z.string().trim().min(1).max(4000),
  proposedDate: z.string().max(32),
})

export async function sendMentorshipRequest(input: {
  alumniId: string
  topic: string
  pitch: string
  proposedDate: string
}) {
  const { alumniId, topic, pitch, proposedDate } = requestSchema.parse(input)
  const sessionClient = await createSessionClient()
  const user = await sessionClient.account.get()
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
  const adminClient = createAdminClient()

  const [studentProfiles, alumniProfiles] = await Promise.all([
    sessionClient.tablesDB.listRows(
      databaseId,
      'profiles',
      [Query.equal('userId', user.$id)],
    ),
    adminClient.tablesDB.listRows(
      databaseId,
      'profiles',
      [Query.equal('userId', alumniId)],
    ),
  ])

  if (studentProfiles.rows[0]?.role !== 'student') {
    throw new Error('Only student accounts can send mentorship requests.')
  }
  if (alumniProfiles.rows[0]?.role !== 'alumni') {
    throw new Error('The selected mentor is not an alumni account.')
  }

  let scheduledAt: string | null = null
  if (proposedDate) {
    const date = new Date(proposedDate)
    if (Number.isNaN(date.getTime())) {
      throw new Error('The proposed date and time is invalid.')
    }
    scheduledAt = date.toISOString()
  }

  const requestId = ID.unique()
  const sessionData = {
    studentId: user.$id,
    alumniId,
    topic,
    pitch,
    message: pitch,
    scheduledAt,
    status: 'pending',
  }

  const createdSession = await adminClient.tablesDB.createRow(
    databaseId,
    'mentorship_sessions',
    ID.unique(),
    sessionData,
  )

  try {
    await adminClient.tablesDB.createRow(
      databaseId,
      'requests',
      requestId,
      {
        studentId: user.$id,
        alumniId,
        type: 'mentorship',
        message: `${topic}: ${pitch}`,
        status: 'pending',
      },
    )
  } catch (requestError) {
    try {
      await adminClient.tablesDB.deleteRow(
        databaseId,
        'mentorship_sessions',
        createdSession.$id,
      )
    } catch (cleanupError) {
      throw new AggregateError(
        [requestError, cleanupError],
        'The request could not be saved and its session could not be rolled back.',
      )
    }
    throw requestError
  }
}

export async function updateMentorshipRequestStatus(
  requestIdInput: string,
  statusInput: 'accepted' | 'declined',
) {
  const requestId = z.string().min(1).max(36).parse(requestIdInput)
  const status = requestStatusSchema.parse(statusInput)
  const sessionClient = await createSessionClient()
  const user = await sessionClient.account.get()
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!
  const adminClient = createAdminClient()

  const profiles = await sessionClient.tablesDB.listRows(
    databaseId,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  if (profiles.rows[0]?.role !== 'alumni') {
    throw new Error('Only alumni can respond to mentorship requests.')
  }

  const requests = await adminClient.tablesDB.listRows(
    databaseId,
    'requests',
    [Query.equal('$id', requestId), Query.limit(1)],
  )
  const request = requests.rows[0]
  if (
    !request
    || request.alumniId !== user.$id
    || request.type !== 'mentorship'
    || request.status !== 'pending'
  ) {
    throw new Error('This pending mentorship request is not available to you.')
  }

  await adminClient.tablesDB.updateRow(
    databaseId,
    'requests',
    requestId,
    { status },
  )
  revalidatePath('/dashboard/student/sessions')
  revalidatePath('/alumni')

  const sessions = await adminClient.tablesDB.listRows(
    databaseId,
    'mentorship_sessions',
    [
      Query.equal('studentId', request.studentId),
      Query.equal('alumniId', user.$id),
      Query.equal('status', 'pending'),
      Query.limit(5000),
    ],
  )
  await Promise.all(sessions.rows.map((session) =>
    adminClient.tablesDB.updateRow(
      databaseId,
      'mentorship_sessions',
      session.$id,
      { status },
    ),
  ))
}
