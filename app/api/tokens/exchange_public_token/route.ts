import { plaidClient } from '../../utils/plaid';
import { createClient } from '@/utils/supabase/server';
import { CountryCode } from 'plaid';
import {
  addAccount,
  addBankNameForItem,
  addItem,
} from '../../utils/SupabaseDB';
export const dynamic = 'force-dynamic'; // defaults to auto

export async function POST(req: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No logged in user');
    }

    const res = await req.json();
    console.log(res);
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: res.publicToken,
    });

    const tokenData = exchangeResponse.data;
    await addItem(tokenData.item_id, user.id, tokenData.access_token);
    await populateBankName(tokenData.item_id, tokenData.access_token);
    await populateAccountNames(tokenData.access_token);

    return Response.json({ ok: true });
  } catch (error) {
    console.error(`Running into an error!`);
    Response.error();
  }
}

const populateBankName = async (itemId: string, accessToken: string) => {
  try {
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });
    const institutionId = itemResponse.data.item.institution_id;
    if (institutionId == null) {
      return;
    }
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    const institutionName = institutionResponse.data.institution.name;
    await addBankNameForItem(itemId, institutionName);
  } catch (error) {
    console.log(`Ran into an error! ${error}`);
  }
};

const populateAccountNames = async (accessToken: string) => {
  try {
    const acctsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const acctsData = acctsResponse.data;
    const itemId = acctsData.item.item_id;
    await Promise.all(
      acctsData.accounts.map(async (acct) => {
        await addAccount(acct.account_id, itemId, acct.name);
      })
    );
  } catch (error) {
    console.log(`Ran into an error! ${error}`);
  }
};
