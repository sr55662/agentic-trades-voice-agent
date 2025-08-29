import { describe, it, expect } from 'vitest';
import { classifyYesNo } from '../src/llm/consent_classifier';

describe('classifyYesNo', () => {
  it('detects yes variants', () => {
    ['yes','yeah','ok','okay','please','i do','go ahead'].forEach(s => {
      expect(classifyYesNo(s)).toBe('yes');
    });
  });
  it('detects no variants', () => {
    ['no','nope','nah','do not','don\'t','stop','decline','not now'].forEach(s => {
      expect(classifyYesNo(s)).toBe('no');
    });
  });
  it('unknown by default', () => {
    expect(classifyYesNo('maybe later')).toBe('unknown');
  });
});
