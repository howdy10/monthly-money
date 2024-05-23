import { RemovedTransaction, Transaction } from 'plaid/dist/api';
import { Database, Tables, Enums } from '@/utils/supabase/supabase';
import {
  addNewTransaction,
  getItemIdsForUser,
  getItemInfo,
  markTransactionAsRemoved,
  modifyExistingTransaction,
  saveCursorForItem,
} from '../../utils/SupabaseDB';
import { plaidClient } from '../../utils/plaid';
import { getLoggedInUserId } from '../../utils/supabaseHelper';
import { toSupabaseTransaction } from '../../utils/supabaseTransformers';
export const dynamic = 'force-dynamic'; // defaults to auto

export async function POST() {
  try {
    const userId = await getLoggedInUserId();

    const items = await getItemIdsForUser(userId);
    const fullResults = await Promise.all(
      items.map(async (item) => {
        console.log(item);
        return await syncTransactions(item.id);
      })
    );

    return Response.json({ completeResults: fullResults });
  } catch (error) {
    console.error(`Running into an error!`);
    return Response.error();
  }
}

/**
 * Given an item ID, this will fetch all transactions for all accounts
 * associated with this item using the sync API. We can call this manually
 * using the /sync endpoint above, or we can call this in response
 * to a webhook
 */
const syncTransactions = async function (itemId: string) {
  const summary = { added: 0, removed: 0, modified: 0 };

  // 1. Fetch out most recent cursor from the DB
  const {
    access_token: accessToken,
    transaction_cursor: transactionCursor,
    user_id: userId,
  } = (await getItemInfo(itemId)) ?? {};
  if (!accessToken) {
    throw new Error('No access token for item');
  }

  // 2. Fetch all our transactions since the last cursor
  // Called method to keep calling until all transactions are back
  const allData = await fetchNewSyncData(
    accessToken,
    transactionCursor || undefined
  );

  // 3. Add new transactions to our DB
  // The map returns an array of promises and will only continue once all promises resolve
  await Promise.all(
    allData.added.map(async (txnObj) => {
      const dbTransaction = toSupabaseTransaction(txnObj);
      const result = await addNewTransaction(dbTransaction);
      if (result) {
        summary.added++;
      }
    })
  );
  // 4. Updated any modified transactions
  await Promise.all(
    allData.modified.map(async (txnObj) => {
      const dbTransaction = toSupabaseTransaction(txnObj);
      const result = await modifyExistingTransaction(
        dbTransaction,
        txnObj.transaction_id
      );
      if (result) {
        summary.modified++;
      }
    })
  );

  // 5. Do something with removed transactions
  await Promise.all(
    allData.removed.map(async (txnMini) => {
      // Could do either or One is a real delete other is just mark
      if (!txnMini.transaction_id) {
        return;
      }
      // const result = await db.deleteExistingTransaction(txnMini.transaction_id);
      const result = await markTransactionAsRemoved(txnMini.transaction_id);

      if (result) {
        summary.removed++;
      }
    })
  );

  // 6. save out most recent cursor
  await saveCursorForItem(allData.nextCursor || null, itemId);
  return summary;
};

interface TransactionsSyncResponse {
  added: Array<Transaction>;
  modified: Array<Transaction>;
  removed: Array<RemovedTransaction>;
  nextCursor: string | undefined;
}

const fetchNewSyncData = async function (
  accessToken: string,
  initialCursor: string | undefined,
  retiresLeft = 3
): Promise<TransactionsSyncResponse> {
  let keepGoing = false;
  const allData: TransactionsSyncResponse = {
    added: [],
    modified: [],
    removed: [],
    nextCursor: initialCursor,
  };
  if (retiresLeft < 0) {
    console.error(`Too many retires!`);
    return allData;
  }
  try {
    do {
      const results = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: allData.nextCursor,
        options: {
          //more categories sent back in transaction call. With newer categories
          include_personal_finance_category: true,
        },
      });
      const newData = results.data;
      allData.added = allData.added.concat(newData.added);
      allData.modified = allData.modified.concat(newData.modified);
      allData.removed = allData.removed.concat(newData.removed);
      allData.nextCursor = newData.next_cursor;
      keepGoing = newData.has_more;
      console.log(
        `Added: ${newData.added.length} Modified: ${newData.modified.length} Removed: ${newData.removed.length}`
      );
    } while (keepGoing === true);
    console.log(`All Done`);
    console.log(`Final cursor: ${allData.nextCursor}`);
    return allData;
  } catch (error) {
    // In theory, we can look at error.response?.data?.error_code
    await setTimeout(() => {}, 1000);
    return fetchNewSyncData(accessToken, initialCursor, retiresLeft - 1);
  }
};
