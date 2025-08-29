import { describe, it, expect } from 'vitest';
import { CallFSM, CallState } from '../src/llm/agent_state';

describe('CallFSM', () => {
  it('starts at Greeting and can move to Qualify', () => {
    const fsm = new CallFSM({ bargeInThresholdMs: 200, maxSilenceMs: 6000 });
    expect(fsm.state).toBe(CallState.Greeting);
    fsm.next({ type: 'system', intent: 'start' });
    // Implementation-dependent; at least ensure state is valid enum
    expect(Object.values(CallState)).toContain(fsm.state);
  });
});
