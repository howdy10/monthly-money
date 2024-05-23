import { FunctionComponent } from 'react';
import {
  PlaidLinkError,
  PlaidLinkOnEventMetadata,
  PlaidLinkOnExitMetadata,
  PlaidLinkOnSuccessMetadata,
  PlaidLinkOptions,
  usePlaidLink,
} from 'react-plaid-link';

interface PlaidLinkComponentProps {
  token: string;
  customSuccessHandler: () => void;
}

export const PlaidLink: FunctionComponent<PlaidLinkComponentProps> = ({
  token,
  customSuccessHandler,
}) => {
  const config: PlaidLinkOptions = {
    token,
    onSuccess: async (publicToken, metadata) => {
      console.log(`Finished with Link! ${JSON.stringify(metadata)}`);
      await fetch('/api/tokens/exchange_public_token', {
        method: 'POST',
        body: JSON.stringify({
          publicToken: publicToken,
        }),
      });
      console.log('Done exchanging our token.');
      customSuccessHandler();
    },
    onExit: async (err, metadata) => {
      console.debug(
        `Exited early. Error: ${JSON.stringify(err)} Metadata: ${JSON.stringify(
          metadata
        )}`
      );
    },
    onEvent: (eventName, metadata) => {
      console.debug(
        `Event ${eventName}, Metadata: ${JSON.stringify(metadata)}`
      );
    },
  };

  const { open, ready, error } = usePlaidLink(config);

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="py-2 px-4 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
    >
      Connect a bank account
    </button>
  );
};
