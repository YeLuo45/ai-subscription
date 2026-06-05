/**
 * ConsensusEngine — majority voting + agreement
 *
 * Inspired by: chatdev multi-agent consensus
 *
 * Multiple agents vote on proposals. The engine tallies votes
 * and decides based on the configured strategy.
 *
 * Strategies:
 *   - majority: >50% of votes
 *   - supermajority: >=2/3 of votes
 *   - unanimous: all votes agree
 *   - plurality: most-voted wins (any > 0)
 *   - weighted: votes have weight, decision by total weight
 *
 * Vote lifecycle:
 *   - open -> voting -> decided / failed
 *
 * Tracks voter participation, dissent, and time-to-decision.
 */

export type Vote = 'yes' | 'no' | 'abstain';
export type ConsensusStrategy = 'majority' | 'supermajority' | 'unanimous' | 'plurality' | 'weighted';
export type ProposalStatus = 'open' | 'voting' | 'decided' | 'failed';

export interface Voter {
  id: string;
  name: string;
  weight: number;
}

export interface Ballot {
  voterId: string;
  vote: Vote;
  reason?: string;
  timestamp: number;
}

export interface Proposal {
  id: string;
  description: string;
  status: ProposalStatus;
  strategy: ConsensusStrategy;
  voters: Voter[];
  ballots: Ballot[];
  createdAt: number;
  decidedAt?: number;
  /** The winning option (if decided) */
  decision?: Vote;
}

export interface DecisionResult {
  decided: boolean;
  decision?: Vote;
  tally: Record<Vote, number>;
  weightedTally: Record<Vote, number>;
  /** Approval ratio (yes / (yes + no)) — abstain excluded */
  approvalRatio: number;
  reason: string;
}

export class ConsensusEngine {
  private proposals: Map<string, Proposal> = new Map();
  private counter: number = 0;

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Create a new proposal with voters and strategy.
   */
  createProposal(description: string, voters: Voter[], strategy: ConsensusStrategy = 'majority'): Proposal {
    if (voters.length === 0) throw new Error('at least one voter required');
    const id = this.nextId('prop');
    const proposal: Proposal = {
      id,
      description,
      status: 'open',
      strategy,
      voters: [...voters],
      ballots: [],
      createdAt: Date.now(),
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  /**
   * Open a proposal for voting (transitions open -> voting).
   */
  openForVoting(proposalId: string): boolean {
    const p = this.proposals.get(proposalId);
    if (!p || p.status !== 'open') return false;
    p.status = 'voting';
    return true;
  }

  /**
   * Cast a vote.
   */
  vote(proposalId: string, voterId: string, vote: Vote, reason?: string): boolean {
    const p = this.proposals.get(proposalId);
    if (!p) return false;
    if (p.status !== 'voting') return false;
    const voter = p.voters.find((v) => v.id === voterId);
    if (!voter) return false;
    // Remove existing ballot from this voter
    p.ballots = p.ballots.filter((b) => b.voterId !== voterId);
    p.ballots.push({ voterId, vote, reason, timestamp: Date.now() });
    return true;
  }

  /**
   * Tally the votes and decide.
   */
  decide(proposalId: string): DecisionResult | null {
    const p = this.proposals.get(proposalId);
    if (!p) return null;
    const tally: Record<Vote, number> = { yes: 0, no: 0, abstain: 0 };
    const weightedTally: Record<Vote, number> = { yes: 0, no: 0, abstain: 0 };
    for (const ballot of p.ballots) {
      const voter = p.voters.find((v) => v.id === ballot.voterId);
      const weight = voter?.weight ?? 1;
      tally[ballot.vote] += 1;
      weightedTally[ballot.vote] += weight;
    }
    const total = p.ballots.length;
    const approvalRatio = tally.yes + tally.no > 0 ? tally.yes / (tally.yes + tally.no) : 0;

    let result: DecisionResult;
    switch (p.strategy) {
      case 'majority': {
        if (tally.yes > total / 2) {
          result = { decided: true, decision: 'yes', tally, weightedTally, approvalRatio, reason: 'majority yes' };
        } else if (tally.no > total / 2) {
          result = { decided: true, decision: 'no', tally, weightedTally, approvalRatio, reason: 'majority no' };
        } else {
          result = { decided: false, tally, weightedTally, approvalRatio, reason: 'no majority' };
        }
        break;
      }
      case 'supermajority': {
        if (tally.yes >= (2 / 3) * total) {
          result = { decided: true, decision: 'yes', tally, weightedTally, approvalRatio, reason: 'supermajority yes' };
        } else if (tally.no >= (2 / 3) * total) {
          result = { decided: true, decision: 'no', tally, weightedTally, approvalRatio, reason: 'supermajority no' };
        } else {
          result = { decided: false, tally, weightedTally, approvalRatio, reason: 'no supermajority' };
        }
        break;
      }
      case 'unanimous': {
        if (tally.yes === total && total > 0) {
          result = { decided: true, decision: 'yes', tally, weightedTally, approvalRatio, reason: 'unanimous yes' };
        } else if (tally.no > 0) {
          result = { decided: true, decision: 'no', tally, weightedTally, approvalRatio, reason: 'at least one no' };
        } else {
          result = { decided: false, tally, weightedTally, approvalRatio, reason: 'waiting for all votes' };
        }
        break;
      }
      case 'plurality': {
        const max = Math.max(tally.yes, tally.no, tally.abstain);
        if (max === 0) {
          result = { decided: false, tally, weightedTally, approvalRatio, reason: 'no votes' };
        } else if (tally.yes === max) {
          result = { decided: true, decision: 'yes', tally, weightedTally, approvalRatio, reason: 'plurality yes' };
        } else if (tally.no === max) {
          result = { decided: true, decision: 'no', tally, weightedTally, approvalRatio, reason: 'plurality no' };
        } else {
          result = { decided: false, tally, weightedTally, approvalRatio, reason: 'tie' };
        }
        break;
      }
      case 'weighted': {
        const totalWeight = p.voters.reduce((s, v) => s + v.weight, 0);
        if (weightedTally.yes > totalWeight / 2) {
          result = { decided: true, decision: 'yes', tally, weightedTally, approvalRatio, reason: 'weighted majority yes' };
        } else if (weightedTally.no > totalWeight / 2) {
          result = { decided: true, decision: 'no', tally, weightedTally, approvalRatio, reason: 'weighted majority no' };
        } else {
          result = { decided: false, tally, weightedTally, approvalRatio, reason: 'no weighted majority' };
        }
        break;
      }
    }

    if (result.decided) {
      p.status = 'decided';
      p.decidedAt = Date.now();
      p.decision = result.decision;
    } else {
      p.status = 'failed';
    }
    return result;
  }

  /** Get a proposal by id. */
  getProposal(id: string): Proposal | undefined {
    return this.proposals.get(id);
  }

  /** List all proposals. */
  listProposals(): Proposal[] {
    return Array.from(this.proposals.values()).map((p) => ({ ...p, voters: [...p.voters], ballots: [...p.ballots] }));
  }

  /** Cancel a proposal. */
  cancel(id: string): boolean {
    const p = this.proposals.get(id);
    if (!p) return false;
    if (p.status === 'decided' || p.status === 'failed') return false;
    p.status = 'failed';
    return true;
  }

  /** Statistics. */
  stats(): {
    totalProposals: number;
    byStatus: Record<ProposalStatus, number>;
    byStrategy: Record<ConsensusStrategy, number>;
  } {
    const byStatus: Record<ProposalStatus, number> = { open: 0, voting: 0, decided: 0, failed: 0 };
    const byStrategy: Record<ConsensusStrategy, number> = { majority: 0, supermajority: 0, unanimous: 0, plurality: 0, weighted: 0 };
    for (const p of this.proposals.values()) {
      byStatus[p.status] += 1;
      byStrategy[p.strategy] += 1;
    }
    return {
      totalProposals: this.proposals.size,
      byStatus,
      byStrategy,
    };
  }
}
