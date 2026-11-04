import fs from 'node:fs'
import path from 'node:path'
import { Client, Permission, Query, Role, TablesDB } from 'node-appwrite'

const localEnvPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(localEnvPath)) {
  for (const line of fs.readFileSync(localEnvPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

const requiredEnv = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be set before provisioning Appwrite tables.`)
  return value
}

const databaseId = requiredEnv('NEXT_PUBLIC_DATABASE_ID')
const client = new Client()
  .setEndpoint(requiredEnv('NEXT_PUBLIC_APPWRITE_ENDPOINT'))
  .setProject(requiredEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID'))
  .setKey(requiredEnv('APPWRITE_API_KEY'))
const tablesDB = new TablesDB(client)
const tablePermissions = [Permission.create(Role.users())]

const text = (key, required = false, array = false) => ({ key, type: 'text', required, array })
const integer = (key, required = false) => ({ key, type: 'integer', required })
const boolean = (key, required = false, defaultValue = false) => ({
  key,
  type: 'boolean',
  required,
  ...(required ? {} : { xdefault: defaultValue }),
})
const datetime = (key) => ({ key, type: 'datetime', required: false })
const email = (key) => ({ key, type: 'email', required: false })
const url = (key) => ({ key, type: 'url', required: false })

const tableSchemas = [
  {
    name: 'profiles',
    id: requiredEnv('NEXT_PUBLIC_PROFILES_TABLE_ID'),
    columns: [
      text('userId', true), text('role', true), text('fullName', true), text('bio'),
      text('skills', false, true), text('major'), text('company'), text('jobTitle'),
      email('email'), text('headline'), url('avatarUrl'), text('industry'),
      integer('graduationYear'), url('linkedInUrl'), integer('yearsOfExperience'),
      boolean('openToReferrals'), boolean('openToMentorship'), boolean('isVerified'),
      integer('monthlySessionLimit'), text('targetRoles', false, true), text('resumeUrl'),
      text('department'), text('title'), text('techSkills', false, true),
    ],
    indexes: [['userId'], ['role'], ['email']],
  },
  {
    name: 'requests',
    id: requiredEnv('NEXT_PUBLIC_REQUESTS_TABLE_ID'),
    columns: [
      text('studentId', true), text('alumniId', true), text('type', true), text('status', true),
      text('topic'), text('message'), text('resumeUrl'), text('documentUrl'), text('jobTitle'),
      url('jobUrl'), text('company'), text('notes'), text('feedback'), text('pitch'),
      datetime('proposedDate'), datetime('scheduledAt'),
    ],
    indexes: [
      ['studentId'], ['alumniId'], ['studentId', 'alumniId'], ['studentId', 'alumniId', 'type'],
      ['studentId', 'type'], ['alumniId', 'type'], ['status'], ['type', 'status'],
    ],
  },
  {
    name: 'messages',
    id: requiredEnv('NEXT_PUBLIC_MESSAGES_TABLE_ID'),
    columns: [
      text('conversationId', true), text('senderId', true), text('content', true),
      text('studentId'), text('alumniId'), boolean('read'),
    ],
    indexes: [['conversationId'], ['conversationId', 'studentId'], ['conversationId', 'alumniId'], ['senderId']],
  },
  {
    name: 'announcements',
    id: requiredEnv('NEXT_PUBLIC_ANNOUNCEMENTS_TABLE_ID'),
    columns: [
      text('authorId', true), text('title', true), text('content', true), text('priority', true),
      url('posterUrl'), datetime('eventDate'), datetime('updatedAt'),
    ],
    indexes: [['authorId'], ['priority']],
  },
  {
    name: 'notifications',
    id: process.env.NEXT_PUBLIC_NOTIFICATIONS_TABLE_ID || 'notifications',
    columns: [
      text('userId', true), text('type', true), text('content', true), text('link'), boolean('isRead', true),
    ],
    indexes: [['userId'], ['userId', 'isRead'], ['isRead']],
  },
  {
    name: 'alumni_profiles',
    id: 'alumni_profiles',
    columns: [
      text('profileId', true), text('company'), text('jobTitle'), text('industry'),
      integer('yearsOfExperience'), boolean('openToReferrals'), boolean('openToMentorship'),
      integer('monthlySessionLimit'), boolean('isVerified'),
    ],
    indexes: [['profileId'], ['isVerified']],
  },
  {
    name: 'student_profiles',
    id: 'student_profiles',
    columns: [
      text('profileId', true), text('major'), integer('graduationYear'),
      text('targetRoles', false, true), text('resumeUrl'),
    ],
    indexes: [['profileId']],
  },
  {
    name: 'teacher_profiles',
    id: 'teacher_profiles',
    columns: [text('profileId', true), text('department'), text('title'), boolean('isVerified')],
    indexes: [['profileId']],
  },
  {
    name: 'skills',
    id: 'skills',
    columns: [text('name', true), text('category')],
    indexes: [['name']],
  },
  {
    name: 'profile_skills',
    id: 'profile_skills',
    columns: [text('profileId', true), text('skillId', true)],
    indexes: [['profileId'], ['skillId'], ['profileId', 'skillId']],
  },
  {
    name: 'conversations',
    id: 'conversations',
    columns: [text('studentId', true), text('alumniId', true)],
    indexes: [['studentId'], ['alumniId'], ['studentId', 'alumniId']],
  },
  {
    name: 'conversation_participants',
    id: 'conversation_participants',
    columns: [text('conversationId', true), text('profileId', true), datetime('lastReadAt')],
    indexes: [['conversationId'], ['profileId'], ['conversationId', 'profileId']],
  },
  {
    name: 'mentorship_sessions',
    id: 'mentorship_sessions',
    columns: [
      text('studentId', true), text('alumniId', true), text('topic', true), text('pitch'),
      text('message'), datetime('proposedDate'), datetime('scheduledAt'), text('status', true),
    ],
    indexes: [['studentId'], ['alumniId'], ['studentId', 'alumniId'], ['status']],
  },
  {
    name: 'resume_reviews',
    id: 'resume_reviews',
    columns: [
      text('studentId', true), text('alumniId', true), text('resumeUrl', true),
      text('notes'), text('feedback'), text('status', true),
    ],
    indexes: [['studentId'], ['alumniId'], ['studentId', 'alumniId'], ['status']],
  },
  {
    name: 'referral_requests',
    id: 'referral_requests',
    columns: [
      text('studentId', true), text('alumniId', true), text('company', true), text('jobTitle'),
      url('jobUrl'), text('resumeUrl'), text('message'), text('status', true),
    ],
    indexes: [['studentId'], ['alumniId'], ['studentId', 'alumniId'], ['status']],
  },
]

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForResource(listResource, key, tableId, resourceId) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { [key]: resources } = await listResource(tableId)
    const resource = resources.find((item) => item.key === resourceId)
    if (resource?.status === 'available') return
    if (resource?.status === 'failed') {
      throw new Error(`Appwrite resource ${resourceId} failed for table ${tableId}.`)
    }
    await wait(1000)
  }
  throw new Error(`Timed out waiting for Appwrite resource ${resourceId} in table ${tableId}.`)
}

async function ensureColumn(tableId, column) {
  const { columns } = await tablesDB.listColumns({
    databaseId,
    tableId,
    queries: [Query.limit(100)],
  })
  if (columns.some((existing) => existing.key === column.key)) return

  const args = {
    databaseId,
    tableId,
    key: column.key,
    required: column.required,
    array: column.array,
  }
  switch (column.type) {
    case 'text':
      await tablesDB.createTextColumn(args)
      break
    case 'integer':
      await tablesDB.createIntegerColumn(args)
      break
    case 'boolean':
      await tablesDB.createBooleanColumn({ ...args, xdefault: column.xdefault })
      break
    case 'datetime':
      await tablesDB.createDatetimeColumn(args)
      break
    case 'email':
      await tablesDB.createEmailColumn(args)
      break
    case 'url':
      await tablesDB.createUrlColumn(args)
      break
    default:
      throw new Error(`Unsupported column type: ${column.type}`)
  }
  await waitForResource(
    (id) => tablesDB.listColumns({ databaseId, tableId: id, queries: [Query.limit(100)] }),
    'columns',
    tableId,
    column.key,
  )
}

async function ensureIndex(tableId, fields, indexNumber, columnsByKey) {
  const key = `idx_${indexNumber}`
  const { indexes } = await tablesDB.listIndexes({
    databaseId,
    tableId,
    queries: [Query.limit(100)],
  })
  const existing = indexes.find((index) => index.columns.join(',') === fields.join(','))
  if (existing?.status === 'available') return
  if (existing) {
    if (existing.status !== 'failed' && existing.status !== 'stuck') {
      await waitForResource(
        (id) => tablesDB.listIndexes({ databaseId, tableId: id, queries: [Query.limit(100)] }),
        'indexes',
        tableId,
        existing.key,
      )
      return
    }
    await tablesDB.deleteIndex({ databaseId, tableId, key: existing.key })
    let deleted = false
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const current = await tablesDB.listIndexes({
        databaseId,
        tableId,
        queries: [Query.limit(100)],
      })
      if (!current.indexes.some((index) => index.key === existing.key)) {
        deleted = true
        break
      }
      await wait(1000)
    }
    if (!deleted) throw new Error(`Timed out deleting failed index ${existing.key} from ${tableId}.`)
  }

  const lengths = fields.map((field) => {
    const type = columnsByKey.get(field)?.type
    if (type === 'email') return 254
    if (type === 'text' || type === 'url') return 255
    return 0
  })
  await tablesDB.createIndex({
    databaseId,
    tableId,
    key,
    type: 'key',
    columns: fields,
    ...(lengths.some(Boolean) ? { lengths } : {}),
  })
  await waitForResource(
    (id) => tablesDB.listIndexes({ databaseId, tableId: id, queries: [Query.limit(100)] }),
    'indexes',
    tableId,
    key,
  )
}

async function provision() {
  const { tables } = await tablesDB.listTables({ databaseId, queries: [Query.limit(100)] })
  for (const schema of tableSchemas) {
    const existing = tables.find((table) => table.$id === schema.id)
    if (!existing) {
      await tablesDB.createTable({
        databaseId,
        tableId: schema.id,
        name: schema.name,
        permissions: tablePermissions,
        rowSecurity: true,
      })
    } else {
      await tablesDB.updateTable({
        databaseId,
        tableId: schema.id,
        permissions: tablePermissions,
        rowSecurity: true,
        purge: true,
      })
    }

    for (const column of schema.columns) {
      await ensureColumn(schema.id, column)
    }
    const columnsByKey = new Map(schema.columns.map((column) => [column.key, column]))
    for (const [indexNumber, fields] of schema.indexes.entries()) {
      await ensureIndex(schema.id, fields, indexNumber + 1, columnsByKey)
    }
    console.log(`Provisioned ${schema.name}`)
  }
}

provision().catch((error) => {
  console.error('Appwrite TablesDB provisioning failed:', error.message)
  process.exitCode = 1
})
