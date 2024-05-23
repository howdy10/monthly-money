'use client';
import { PlaidLink } from '@/app/components/PlaidLink';
import { TransactionsTableComponent } from '@/app/components/transactionsTable';
import { TableName } from '@/utils/dbTypes/constants';
import { createClient } from '@/utils/supabase/client';
import { Tables } from '@/utils/supabase/supabase';
import { useEffect, useState } from 'react';

export default function ProtectedPage() {
  // Then we get fancy with features like sum of transactions, reviewed flag, separate month pages

  const [banks, setBanks] = useState<Tables<'plaidItems'>[] | null>(null);
  const [transactions, setTransactions] = useState<any[] | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    refreshBanksFromDB();
    refreshTransactionsFromDB();
    if (!linkToken) {
      const getLinkToken = async () => {
        const response = await fetch('/api/tokens/generate_link_token', {
          method: 'POST',
        });
        const { link_token } = await response.json();
        setLinkToken(link_token);
      };
      getLinkToken();
    }
  }, []);

  const refreshBanksFromDB = () => {
    const getData = async () => {
      const { data } = await supabase.from(TableName.ITEMS).select();
      console.debug(data);
      setBanks(data);
    };
    console.debug('Calling get banks');
    getData();
  };

  const refreshTransactionsFromDB = () => {
    const getData = async () => {
      const { data } = await supabase
        .from(TableName.TRANSACTIONS)
        .select('*, plaidAccounts (name)')
        .order('date', { ascending: false });
      console.debug(data);
      setTransactions(data);
    };
    console.debug('Calling get Transactions');
    getData();
  };

  const syncTransactions = () => {
    console.log('Attempt to resync transaction with plaid');
    const getTransactionFromPlaid = async () => {
      const response = await fetch('/api/transactions/sync', {
        method: 'POST',
      });
      console.log(response);
    };
    getTransactionFromPlaid();
  };

  // Pull Banks and transaction from db with checks if they exists ex. refreshSignInStatus
  return (
    <div>
      {banks?.length == 0
        ? 'You are not connected to any banks'
        : `You are connected to ${banks?.length} Banks`}

      {linkToken === null ? (
        // TODO: Add like a loading component while the key is being fetch.
        'No Token'
      ) : (
        <PlaidLink
          token={linkToken}
          customSuccessHandler={refreshBanksFromDB}
        />
      )}
      {/* TODO only show this button when we are able to make the call (aka we have all req.) */}
      <button
        onClick={() => syncTransactions()}
        className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
      >
        Sync transactions with Plaid
      </button>
      <TransactionsTableComponent data={transactions || []} />
    </div>
  );
}
