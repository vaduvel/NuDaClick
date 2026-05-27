import type { ShareIntakeResult } from './shareIntake.types';

const EMPTY_SHARE_STATE: ShareIntakeResult = {
  sharedPayloads: [],
  resolvedSharedPayloads: [],
  clearSharedPayloads: () => {},
  isResolving: false,
  error: null,
  refreshSharePayloads: () => {},
};

export function useShareIntake(): ShareIntakeResult {
  return EMPTY_SHARE_STATE;
}
