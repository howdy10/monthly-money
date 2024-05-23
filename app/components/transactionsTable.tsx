import { currencyFilter, formatDate } from '@/app/api/utils/helper';
import { Tables } from '@/utils/supabase/supabase';
import React from 'react';

interface TransactionTableData extends Tables<'transactions'> {
  plaidAccounts: {
    name: string | undefined;
  };
}

const columns = [
  { name: 'Amount' },
  { name: 'Merchant' },
  { name: 'Account' },
  { name: 'Date' },
  { name: 'Reviewed' },
];

export const TransactionsTableComponent = ({
  data,
}: {
  data: TransactionTableData[];
}) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((c) => {
            return (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {c.name}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className=" divide-y divide-gray-200">
        {data.map((item: TransactionTableData, index: number) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap">
              {currencyFilter(item.amount)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{item.merchant}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              {item.plaidAccounts.name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              {formatDate(item.date)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              {item.is_reviewed ? 'Check' : 'Nope'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
