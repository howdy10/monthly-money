import { Tables, TablesInsert } from '@/utils/supabase/supabase';
import { Transaction } from 'plaid';

export const toSupabaseTransaction = (
  txnObj: Transaction
): TablesInsert<'transactions'> => {
  return {
    account_id: txnObj.account_id,
    amount: txnObj.amount,
    authorized_date: txnObj.authorized_date,
    currency_code: txnObj.iso_currency_code,
    date: txnObj.date,
    merchant: txnObj.merchant_name ?? txnObj.name,
    id: txnObj.transaction_id,
  };
};
