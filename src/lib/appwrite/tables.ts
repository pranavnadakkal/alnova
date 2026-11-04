export const APPWRITE_TABLE_IDS = {
  profiles: process.env.NEXT_PUBLIC_PROFILES_TABLE_ID || 'profiles',
  requests: process.env.NEXT_PUBLIC_REQUESTS_TABLE_ID || 'requests',
  messages: process.env.NEXT_PUBLIC_MESSAGES_TABLE_ID || 'messages',
  announcements: process.env.NEXT_PUBLIC_ANNOUNCEMENTS_TABLE_ID || 'announcements',
  notifications: process.env.NEXT_PUBLIC_NOTIFICATIONS_TABLE_ID || 'notifications',
  alumni_profiles: 'alumni_profiles',
  student_profiles: 'student_profiles',
  teacher_profiles: 'teacher_profiles',
  skills: 'skills',
  profile_skills: 'profile_skills',
  conversations: 'conversations',
  conversation_participants: 'conversation_participants',
  mentorship_sessions: 'mentorship_sessions',
  resume_reviews: 'resume_reviews',
  referral_requests: 'referral_requests',
} as const

export type AppwriteTableName = keyof typeof APPWRITE_TABLE_IDS
export type AppwriteRowData = Record<
  string,
  string | number | boolean | null | string[] | undefined
>

type PermissionFactory = {
  read: (role: string) => string
  update: (role: string) => string
  delete: (role: string) => string
  user: (userId: string) => string
  users: string
}

export function resolveTableId(tableName: string): string {
  if (!Object.prototype.hasOwnProperty.call(APPWRITE_TABLE_IDS, tableName)) {
    throw new Error(`Unknown Appwrite table: ${tableName}`)
  }
  return APPWRITE_TABLE_IDS[tableName as AppwriteTableName]
}

export function getRowPermissions(
  tableName: string,
  row: AppwriteRowData,
  permission: PermissionFactory,
): string[] {
  const permissions = new Set<string>()
  const grant = (action: 'read' | 'update' | 'delete', role: string) => {
    permissions.add(permission[action](role))
  }
  const grantUser = (
    action: 'read' | 'update' | 'delete',
    userId: string | undefined,
  ) => {
    if (userId) grant(action, permission.user(userId))
  }
  switch (tableName) {
    case 'profiles':
    case 'alumni_profiles':
    case 'student_profiles':
    case 'teacher_profiles': {
      const ownerId = stringValue(row, tableName === 'profiles' ? 'userId' : 'profileId')
      grant('read', permission.users)
      grantUser('update', ownerId)
      grantUser('delete', ownerId)
      break
    }
    case 'requests':
    case 'mentorship_sessions':
    case 'resume_reviews':
    case 'referral_requests':
    case 'conversations':
    case 'messages': {
      const participants = [
        stringValue(row, 'studentId'),
        stringValue(row, 'alumniId'),
      ].filter((id): id is string => Boolean(id))
      if (participants.length === 0) {
        throw new Error(`Missing participant IDs for Appwrite ${tableName} row`)
      }
      for (const id of new Set(participants)) {
        grantUser('read', id)
        grantUser('update', id)
      }
      break
    }
    case 'notifications': {
      const ownerId = stringValue(row, 'userId')
      if (!ownerId) throw new Error('Missing userId for Appwrite notification row')
      grantUser('read', ownerId)
      grantUser('update', ownerId)
      grantUser('delete', ownerId)
      break
    }
    case 'announcements': {
      const authorId = stringValue(row, 'authorId')
      grant('read', permission.users)
      grantUser('update', authorId)
      grantUser('delete', authorId)
      break
    }
    case 'skills': {
      grant('read', permission.users)
      break
    }
    case 'profile_skills': {
      const ownerId = stringValue(row, 'profileId')
      grant('read', permission.users)
      grantUser('update', ownerId)
      grantUser('delete', ownerId)
      break
    }
    case 'conversation_participants': {
      const ownerId = stringValue(row, 'profileId')
      if (!ownerId) throw new Error('Missing profileId for Appwrite conversation participant row')
      grantUser('read', ownerId)
      grantUser('update', ownerId)
      break
    }
    default: {
      throw new Error(`Missing row-permission rules for ${tableName}`)
    }
  }

  return [...permissions]
}

function stringValue(row: AppwriteRowData, key: string): string | undefined {
  const value = row[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
