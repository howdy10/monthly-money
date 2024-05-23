import { createClient } from '@/utils/supabase/server';

export async function getLoggedInUserId() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No logged in user');
  }
  return user.id;
}
