import { useIncomingShare } from 'expo-sharing';

import type { ShareIntakeResult } from './shareIntake.types';

export function useShareIntake(): ShareIntakeResult {
  return useIncomingShare() as ShareIntakeResult;
}
