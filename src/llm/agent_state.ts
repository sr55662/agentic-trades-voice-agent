/**
 * src/llm/agent_state.ts
 * Minimal, explicit call state machine with timeouts and barge-in control.
 * Integrate into your realtime agent loop.
 */

export enum CallState {
  Greeting = 'Greeting',
  Qualify = 'Qualify',
  Quote = 'Quote',
  Book = 'Book',
  Payment = 'Payment',
  Confirm = 'Confirm',
  Escalate = 'Escalate',
  End = 'End'
}

export type Event =
  | { type: 'user_speaks'; intent?: string }
  | { type: 'timeout' }
  | { type: 'llm_error' }
  | { type: 'payment_ok' }
  | { type: 'payment_fail' }
  | { type: 'book_ok' }
  | { type: 'book_fail' }
  | { type: 'handoff' }
  | { type: 'goodbye' };

export interface FSMConfig {
  bargeInThresholdMs: number;   // e.g., 200
  maxSilenceMs: number;         // e.g., 6000
}

export class CallFSM {
  state: CallState = CallState.Greeting;
  constructor(public cfg: FSMConfig) {}

  next(ev: Event): CallState {
    switch (this.state) {
      case CallState.Greeting:
        if (ev.type === 'user_speaks') this.state = CallState.Qualify;
        if (ev.type === 'timeout') this.state = CallState.End;
        break;

      case CallState.Qualify:
        if (ev.type === 'user_speaks' && ev.intent === 'quote') this.state = CallState.Quote;
        if (ev.type === 'user_speaks' && ev.intent === 'book') this.state = CallState.Book;
        if (ev.type === 'handoff') this.state = CallState.Escalate;
        break;

      case CallState.Quote:
        if (ev.type === 'user_speaks' && ev.intent === 'book') this.state = CallState.Book;
        if (ev.type === 'timeout') this.state = CallState.End;
        break;

      case CallState.Book:
        if (ev.type === 'book_ok') this.state = CallState.Payment;
        if (ev.type === 'book_fail') this.state = CallState.Escalate;
        break;

      case CallState.Payment:
        if (ev.type === 'payment_ok') this.state = CallState.Confirm;
        if (ev.type === 'payment_fail') this.state = CallState.Escalate;
        break;

      case CallState.Confirm:
        if (ev.type === 'goodbye') this.state = CallState.End;
        break;

      case CallState.Escalate:
        if (ev.type === 'handoff') this.state = CallState.End;
        break;

      case CallState.End:
        break;
    }
    return this.state;
  }
}