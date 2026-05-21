/**
 * Cost Optimizer Module
 * Cost-aware routing, health checking, and budget management
 */

// Types
export * from './types';

// Cost Estimation
export {
  estimateCost,
  getModelsByEstimatedCost,
  findCheapestModel,
  type CostEstimation,
} from './cost-estimator';

// Health Checking
export {
  ProviderHealthChecker,
  getHealthChecker,
} from './health-checker';

// Budget Control
export {
  BudgetController,
  getBudgetController,
} from './budget-controller';

// Smart Scoring
export {
  scoreModel,
  rankModels,
  selectBestModel,
  DEFAULT_SCORING_WEIGHTS,
} from './smart-scorer';
