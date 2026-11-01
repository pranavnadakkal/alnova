'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type AdminMutationClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>
    }
    insert: (values: Record<string, unknown>) => Promise<{ error: Error | null }>
  }
}

export async function verifyAlumni(profileId: string) {
  const supabase = await createClient()
  const mutationClient = supabase as unknown as AdminMutationClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in.')

  const { data: admin } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if ((admin as { role?: string } | null)?.role !== 'admin') {
    throw new Error('Only administrators can verify alumni.')
  }

  const { error: verificationError } = await mutationClient
    .from('alumni_profiles')
    .update({ is_verified: true })
    .eq('profile_id', profileId)
  if (verificationError) throw verificationError

  const { error: notificationError } = await mutationClient
    .from('notifications')
    .insert({
      user_id: profileId,
      type: 'alumni_verified',
      content: 'Your alumni profile has been verified.',
      link: '/profile',
      is_read: false,
    })
  if (notificationError) throw notificationError

  revalidatePath('/dashboard/admin')
  revalidatePath('/directory')
}
