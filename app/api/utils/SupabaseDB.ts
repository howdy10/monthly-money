import { TableName } from '@/utils/dbTypes/constants';
import { createClient } from '@/utils/supabase/server';
import { UUID } from 'crypto';
import {
  Database,
  Tables,
  Enums,
  TablesInsert,
  TablesUpdate,
} from '@/utils/supabase/supabase';

const getItemIdsForUser = async function (userId: UUID | string) {
  const supabase = createClient();
  const { data: items } = await supabase
    .from(TableName.ITEMS)
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', 1);
  return items || [];
};

const getItemsAndAccessTokensForUser = async function (userId: UUID | string) {
  const supabase = createClient();
  const { data: items } = await supabase
    .from(TableName.ITEMS)
    .select('id, access_token')
    .eq('user_id', userId)
    .eq('is_active', 1);
  return items;
};

const getAccountIdsForItem = async function (itemId: string) {
  const supabase = createClient();
  const { data: accounts } = await supabase
    .from(TableName.ACCOUNTS)
    .select('id')
    .eq('item_id', itemId);
  return accounts;
};

const confirmItemBelongsToUser = async function (
  possibleItemId: string,
  userId: UUID | string
) {
  const supabase = createClient();
  const { data: result } = await supabase
    .from(TableName.ITEMS)
    .select('id')
    .eq('id', possibleItemId)
    .eq('user_id', userId);
  console.log(result);
  if (result && result[0].id === possibleItemId) {
    return true;
  } else {
    console.warn(
      `User ${userId} claims to own item they don't: ${possibleItemId}`
    );
    return false;
  }
};

const deactivateItem = async function (itemId: string) {
  const supabase = createClient();
  const { data: updateResult, error } = await supabase
    .from(TableName.ITEMS)
    .update({ access_token: 'REVOKED', is_active: false })
    .eq('id', itemId)
    .select();
  return updateResult;
};

const getBankNamesForUser = async function (userId: UUID | string) {
  const supabase = createClient();
  const { data: result } = await supabase
    .from(TableName.ITEMS)
    .select('id, bank_name')
    .eq('user_is', userId)
    .eq('is_active', 1);
  return result;
};

const addItem = async function (
  itemId: string,
  userId: UUID | string,
  accessToken: string
) {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from(TableName.ITEMS)
    .insert({ id: itemId, user_id: userId, access_token: accessToken })
    .select();
  return result;
};

const addBankNameForItem = async function (
  itemId: string,
  institutionName: string
) {
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from(TableName.ITEMS)
    .update({ bank_name: institutionName })
    .eq('id', itemId)
    .select();
  return result;
};

const addAccount = async function (
  accountId: string,
  itemId: string,
  acctName: string
) {
  console.log(`Attempting to add ${accountId} - ${itemId} - ${acctName}`);
  const supabase = createClient();
  const { data: result, error } = await supabase
    .from(TableName.ACCOUNTS)
    .insert({ id: accountId, item_id: itemId, name: acctName })
    .select();
  console.debug(result);
};

const getItemInfo = async function (itemId: string) {
  const supabase = createClient();
  const { data: result } = await supabase
    .from(TableName.ITEMS)
    .select('user_id, access_token, transaction_cursor')
    .eq('id', itemId)
    .maybeSingle();
  return result || undefined;
};

const getItemInfoForUser = async function (
  itemId: string,
  userId: UUID | string
) {
  const supabase = createClient();
  const { data: result } = await supabase
    .from(TableName.ITEMS)
    .select('user_id, access_token, transaction_cursor')
    .eq('id', itemId)
    .eq('user_id', userId);
  return result;
};

const addNewTransaction = async function (
  transactionObj: TablesInsert<'transactions'>,
  pendingTransactionId = null
) {
  try {
    console.log(`Getting ready to insert ${JSON.stringify(transactionObj)}`);
    const supabase = createClient();
    const result = await supabase
      .from(TableName.TRANSACTIONS)
      .insert({
        id: transactionObj.id,
        account_id: transactionObj.account_id,
        date: transactionObj.date,
        authorized_date: transactionObj.authorized_date,
        merchant: transactionObj.merchant,
        amount: transactionObj.amount,
        currency_code: transactionObj.currency_code,
      })
      .select();

    if (result.status !== 201) {
      throw result.error;
    }

    if (pendingTransactionId != null) {
      // Copying over user-created values
      // Good to keep our notes or even splits
      const { data: oldTransaction } = await supabase
        .from(TableName.TRANSACTIONS)
        .select('note, is_removed, is_reviewed')
        .eq('id', pendingTransactionId)
        .maybeSingle();

      if (oldTransaction) {
        const resultOldTransaction = await supabase
          .from(TableName.TRANSACTIONS)
          .update({
            note: oldTransaction.note,
            is_removed: oldTransaction.is_removed,
            is_reviewed: oldTransaction.is_reviewed,
          })
          .eq('id', transactionObj.id)
          .select();
      }
    }

    return result;
  } catch (error) {
    console.error(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

const modifyExistingTransaction = async function (
  transactionObj: TablesUpdate<'transactions'>,
  transactionId: string
) {
  try {
    const supabase = createClient();
    const result = await supabase
      .from(TableName.TRANSACTIONS)
      .update({
        account_id: transactionObj.account_id,
        date: transactionObj.date,
        authorized_date: transactionObj.authorized_date,
        merchant: transactionObj.merchant,
        amount: transactionObj.amount,
        currency_code: transactionObj.currency_code,
        updated_at: Date.now().toString(),
      })
      .eq('id', transactionId)
      .select();

    if (result.status !== 200) {
      throw result.error;
    }
    return result;
  } catch (error) {
    console.error(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

const markTransactionAsRemoved = async function (transactionId: string) {
  try {
    const updatedId = transactionId + '-REMOVED-' + crypto.randomUUID();
    const supabase = createClient();
    const result = await supabase
      .from(TableName.TRANSACTIONS)
      .update({
        id: updatedId,
        is_removed: true,
      })
      .eq('id', transactionId)
      .select();

    if (result.status !== 200) {
      throw result.error;
    }
    return result;
  } catch (error) {
    console.error(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

const markTransactionAsReviewed = async function (transactionId: string) {
  try {
    const supabase = createClient();
    const result = await supabase
      .from(TableName.TRANSACTIONS)
      .update({
        is_reviewed: true,
      })
      .eq('id', transactionId)
      .select();

    if (result.status !== 200) {
      throw result.error;
    }
    return result;
  } catch (error) {
    console.error(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

const deleteExistingTransaction = async function (transactionId: string) {
  try {
    const supabase = createClient();
    const result = await supabase
      .from(TableName.TRANSACTIONS)
      .delete()
      .eq('id', transactionId);
    if (result.status !== 204) {
      throw result.error;
    }
    return result;
  } catch (error) {
    console.error(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

const getTransactionsForUser = async function (
  userId: UUID | string,
  maxNum: number = 50
) {
  const supabase = createClient();
  const { data: results } = await supabase
    .from(TableName.TRANSACTIONS)
    .select()
    .eq('user_id', userId)
    .eq('is_removed', 0);
  return results;
};

const saveCursorForItem = async function (
  transactionCursor: string | null,
  itemId: string
) {
  try {
    const supabase = createClient();
    const results = await supabase
      .from(TableName.ITEMS)
      .update({ transaction_cursor: transactionCursor })
      .eq('id', itemId);
    if (results.status !== 204) {
      throw results.error;
    }
  } catch (error) {
    console.error(
      `It's a big problem that I can't save my cursor. ${JSON.stringify(error)}`
    );
  }
};

export {
  getItemIdsForUser,
  getItemsAndAccessTokensForUser,
  getAccountIdsForItem,
  confirmItemBelongsToUser,
  deactivateItem,
  getBankNamesForUser,
  addItem,
  addBankNameForItem,
  addAccount,
  getItemInfo,
  getItemInfoForUser,
  addNewTransaction,
  modifyExistingTransaction,
  deleteExistingTransaction,
  markTransactionAsRemoved,
  getTransactionsForUser,
  saveCursorForItem,
};
