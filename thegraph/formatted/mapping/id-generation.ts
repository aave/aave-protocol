import { EthereumEvent } from '@graphprotocol/graph-ts';

export function getHistoryId<T extends EthereumEvent>(event: T): string {
  return event.transaction.hash.toHexString();
}
