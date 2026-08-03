export const calculateRiskScore = (events: any[]): number => {
  let score = 0;
  for (const event of events) {
    switch (event.type) {
      case 'ATTESTATION_FAILED': score += 100; break;
      case 'ROOT_DETECTED': score += 40; break;
      case 'FRIDA_DETECTED': score += 30; break;
      case 'HOOK_FRAMEWORK': score += 30; break;
      case 'INVALID_HMAC': score += 50; break;
      case 'REPLAY_ATTACK': score += 50; break;
      case 'DEVICE_CHANGED': score += 40; break;
      case 'EMULATOR': score += 15; break;
      case 'DEBUGGER': score += 20; break;
      default: break;
    }
  }
  return score;
};
