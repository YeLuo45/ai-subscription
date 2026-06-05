/**
 * ConsensusEngine.test.ts — Pure unit tests for majority voting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine, type Voter } from '../ConsensusEngine';

function voters(ids: Array<[string, number?] | string>): Voter[] {
  return ids.map((spec) => {
    if (typeof spec === 'string') return { id: spec, name: spec, weight: 1 };
    return { id: spec[0], name: spec[0], weight: spec[1] ?? 1 };
  });
}

describe('ConsensusEngine — proposal creation', () => {
  let ce: ConsensusEngine;
  beforeEach(() => {
    ce = new ConsensusEngine();
  });

  it('creates a proposal', () => {
    const p = ce.createProposal('test', voters(['a', 'b', 'c']));
    expect(p.id).toMatch(/^prop-/);
    expect(p.status).toBe('open');
  });

  it('rejects empty voter list', () => {
    expect(() => ce.createProposal('test', [])).toThrow('voter required');
  });

  it('openForVoting transitions open to voting', () => {
    const p = ce.createProposal('test', voters([['a', ]]));
    expect(ce.openForVoting(p.id)).toBe(true);
    expect(ce.getProposal(p.id)?.status).toBe('voting');
  });

  it('openForVoting returns false for unknown', () => {
    expect(ce.openForVoting('nope')).toBe(false);
  });

  it('openForVoting returns false for already voting', () => {
    const p = ce.createProposal('test', voters([['a', ]]));
    ce.openForVoting(p.id);
    expect(ce.openForVoting(p.id)).toBe(false);
  });
});

describe('ConsensusEngine — voting', () => {
  let ce: ConsensusEngine;
  beforeEach(() => {
    ce = new ConsensusEngine();
  });

  it('accepts a vote', () => {
    const p = ce.createProposal('test', voters(['a', 'b']));
    ce.openForVoting(p.id);
    expect(ce.vote(p.id, 'a', 'yes')).toBe(true);
    expect(ce.getProposal(p.id)?.ballots.length).toBe(1);
  });

  it('rejects vote on unknown proposal', () => {
    expect(ce.vote('nope', 'a', 'yes')).toBe(false);
  });

  it('rejects vote before openForVoting', () => {
    const p = ce.createProposal('test', voters([['a', ]]));
    expect(ce.vote(p.id, 'a', 'yes')).toBe(false);
  });

  it('rejects vote from unknown voter', () => {
    const p = ce.createProposal('test', voters([['a', ]]));
    ce.openForVoting(p.id);
    expect(ce.vote(p.id, 'unknown', 'yes')).toBe(false);
  });

  it('replaces previous vote from same voter', () => {
    const p = ce.createProposal('test', voters([['a', ]]));
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'a', 'no');
    const prop = ce.getProposal(p.id)!;
    expect(prop.ballots.length).toBe(1);
    expect(prop.ballots[0].vote).toBe('no');
  });
});

describe('ConsensusEngine — majority strategy', () => {
  let ce: ConsensusEngine;
  beforeEach(() => {
    ce = new ConsensusEngine();
  });

  it('yes majority decides', () => {
    const p = ce.createProposal('test', voters([['a', ], ['b', ], ['c', ]]), 'majority');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'yes');
    ce.vote(p.id, 'c', 'no');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(true);
    expect(r.decision).toBe('yes');
    expect(r.tally.yes).toBe(2);
  });

  it('no majority when tied', () => {
    const p = ce.createProposal('test', voters([['a', ], ['b', ]]), 'majority');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'no');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(false);
  });

  it('no majority when all abstain', () => {
    const p = ce.createProposal('test', voters([['a', ], ['b', ]]), 'majority');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'abstain');
    ce.vote(p.id, 'b', 'abstain');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(false);
  });
});

describe('ConsensusEngine — supermajority', () => {
  it('yes needs 2/3', () => {
    const ce = new ConsensusEngine();
    const p = ce.createProposal('test', voters([['a', ], ['b', ], ['c', ]]), 'supermajority');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'yes');
    ce.vote(p.id, 'c', 'no');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(true);
    expect(r.decision).toBe('yes');
  });

  it('does not pass with just simple majority', () => {
    const ce = new ConsensusEngine();
    const p = ce.createProposal('test', voters([['a', ], ['b', ], ['c', ], ['d', ], ['e', ]]), 'supermajority');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'yes');
    ce.vote(p.id, 'c', 'no');
    ce.vote(p.id, 'd', 'no');
    ce.vote(p.id, 'e', 'no');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(false);
  });
});

describe('ConsensusEngine — unanimous', () => {
  it('all yes passes', () => {
    const ce = new ConsensusEngine();
    const p = ce.createProposal('test', voters([['a', ], ['b', ], ['c', ]]), 'unanimous');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'yes');
    ce.vote(p.id, 'c', 'yes');
    expect(ce.decide(p.id)!.decided).toBe(true);
  });

  it('one no fails', () => {
    const ce = new ConsensusEngine();
    const p = ce.createProposal('test', voters([['a', ], ['b', ], ['c', ]]), 'unanimous');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'no');
    ce.vote(p.id, 'c', 'yes');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(true);
    expect(r.decision).toBe('no');
  });
});

describe('ConsensusEngine — plurality', () => {
  it('most-voted wins', () => {
    const ce = new ConsensusEngine();
    const p = ce.createProposal('test', voters([['a', ], ['b', ], ['c', ], ['d', ], ['e', ]]), 'plurality');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'yes');
    ce.vote(p.id, 'c', 'yes');
    ce.vote(p.id, 'd', 'no');
    ce.vote(p.id, 'e', 'abstain');
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(true);
    expect(r.decision).toBe('yes');
  });
});

describe('ConsensusEngine — weighted', () => {
  it('high-weight voter tips the balance', () => {
    const ce = new ConsensusEngine();
    const p = ce.createProposal('test', voters([['a', 1], ['b', 1], ['c', 10]]), 'weighted');
    ce.openForVoting(p.id);
    ce.vote(p.id, 'a', 'yes');
    ce.vote(p.id, 'b', 'no');
    ce.vote(p.id, 'c', 'no');
    // Total weight 12, no weight 11, yes weight 1 — no > 12/2=6
    const r = ce.decide(p.id)!;
    expect(r.decided).toBe(true);
    expect(r.decision).toBe('no');
  });
});

describe('ConsensusEngine — listProposals and cancel', () => {
  let ce: ConsensusEngine;
  beforeEach(() => {
    ce = new ConsensusEngine();
  });

  it('listProposals returns all', () => {
    ce.createProposal('a', voters([['x', ]]));
    ce.createProposal('b', voters([['y', ]]));
    expect(ce.listProposals().length).toBe(2);
  });

  it('cancel transitions to failed', () => {
    const p = ce.createProposal('a', voters([['x', ]]));
    expect(ce.cancel(p.id)).toBe(true);
    expect(ce.getProposal(p.id)?.status).toBe('failed');
  });

  it('cancel returns false for unknown', () => {
    expect(ce.cancel('nope')).toBe(false);
  });

  it('cancel returns false for decided', () => {
    const p = ce.createProposal('a', voters([['x', ]]));
    ce.openForVoting(p.id);
    ce.vote(p.id, 'x', 'yes');
    ce.decide(p.id);
    expect(ce.cancel(p.id)).toBe(false);
  });
});

describe('ConsensusEngine — stats', () => {
  it('reports counts by status and strategy', () => {
    const ce = new ConsensusEngine();
    ce.createProposal('a', voters([['x', ]]), 'majority');
    ce.createProposal('b', voters([['y', ]]), 'supermajority');
    const s = ce.stats();
    expect(s.totalProposals).toBe(2);
    expect(s.byStatus.open).toBe(2);
    expect(s.byStrategy.majority).toBe(1);
    expect(s.byStrategy.supermajority).toBe(1);
  });
});
