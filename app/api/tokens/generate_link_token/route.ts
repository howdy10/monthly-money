import { createClient } from '@/utils/supabase/server';
import { plaidClient } from '../../utils/plaid';
import { CountryCode, Products } from 'plaid';
export const dynamic = 'force-dynamic'; // defaults to auto
export async function POST() {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No logged in user');
    }
    const userId = user.id;
    // This should correspond to a unique id for the current user.
    const userObject = { client_user_id: userId };
    console.log(`Requesting link token for ${userId}`);
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: userObject,
      client_name: 'Where my month money go?',
      language: 'en',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
    });
    console.debug('Plaid link token response - ', { tokenResponse });

    return Response.json(tokenResponse.data);
  } catch (error) {
    console.error(`Running into an error!`);
    return Response.error();
  }
}
