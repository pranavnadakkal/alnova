import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/appwrite/server'
import { Query } from 'node-appwrite'
import AlumniDashboard from '@/components/dashboard/AlumniDashboard'

export default async function AlumniDashboardPage() {
  let sessionClient
  try {
    sessionClient = await createSessionClient()
  } catch {
    redirect('/login')
  }
  const user = await sessionClient.account.get()
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!

  const profiles = await sessionClient.tablesDB.listRows(
    databaseId,
    'profiles',
    [Query.equal('userId', user.$id)],
  )
  const profileDocument = profiles.rows[0]
  const profile = profileDocument && {
    ...profileDocument,
    id: profileDocument.userId || profileDocument.$id,
    user_id: profileDocument.userId || profileDocument.$id,
    full_name: profileDocument.fullName || profileDocument.full_name,
    role: profileDocument.role,
  }

  if (!profile) {
    redirect('/onboarding')
  }

  const isStudent = profile.role?.toLowerCase() === 'student' || profile.role === null

  if (isStudent) {
    redirect('/student-dashboard')
  }

  // Fetch connection requests for stats and recent activity
  const requestResult = await sessionClient.tablesDB.listRows(
    databaseId,
    'requests',
    [Query.equal('alumniId', user.$id), Query.orderDesc('$createdAt'), Query.limit(5)],
  )
  const requests = requestResult.rows.map((request) => ({
    ...request,
    id: request.$id,
    student_id: request.studentId,
    alumni_id: request.alumniId,
    created_at: request.$createdAt,
    status: request.status,
  }))
  const studentIds = requests.map((request) => request.student_id).filter(Boolean)
  const studentResult = studentIds.length
    ? await sessionClient.tablesDB.listRows(
        databaseId,
        'profiles',
        [Query.equal('userId', studentIds)],
      )
    : { rows: [] }
  const studentMap = new Map(studentResult.rows.map((student) => [
    student.userId || student.$id,
    {
      ...student,
      id: student.userId || student.$id,
      user_id: student.userId || student.$id,
      full_name: student.fullName || student.full_name,
    },
  ]))
  const enrichedRequests = requests.map((request) => ({
    ...request,
    student: studentMap.get(request.student_id) || null,
    status: request.status || 'pending',
  }))

  return <AlumniDashboard profile={profile} requests={enrichedRequests} />
}
