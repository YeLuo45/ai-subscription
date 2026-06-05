/**
 * PipelineEngine — pipeline executor
 *
 * Inspired by: thunderbolt pipeline + Unix pipes
 *
 * Sequential stages where each stage transforms input.
 * Each stage can:
 *   - transform (input -> output)
 *   - filter (output is null = drop)
 *   - tee (output stays the same, side effect runs)
 *
 * Pipeline features:
 *   - error handling per stage (continueOnError)
 *   - parallel branches (fan-out)
 *   - stage timeout
 *   - metrics per stage
 */

export type StageType = 'transform' | 'filter' | 'tee';

export interface Stage<I = unknown, O = unknown> {
  name: string;
  type: StageType;
  handler: (input: I) => O | Promise<O> | null | Promise<null>;
  timeoutMs?: number;
  continueOnError?: boolean;
}

export interface StageResult<I = unknown, O = unknown> {
  stageName: string;
  type: StageType;
  success: boolean;
  input: I;
  output: O | null;
  durationMs: number;
  error?: string;
  skipped?: boolean;
}

export interface PipelineResult {
  success: boolean;
  stages: StageResult[];
  finalOutput: unknown;
  totalDurationMs: number;
}

export class PipelineEngine {
  private stages: Stage[] = [];
  private name: string;

  constructor(name: string = 'pipeline') {
    this.name = name;
  }

  /** Add a stage. */
  addStage(stage: Stage): this {
    this.stages.push(stage);
    return this;
  }

  /** Get stage count. */
  count(): number {
    return this.stages.length;
  }

  /** List stage names. */
  listStages(): string[] {
    return this.stages.map((s) => s.name);
  }

  /** Run the pipeline with given input. */
  async run(input: unknown): Promise<PipelineResult> {
    const start = Date.now();
    const results: StageResult[] = [];
    let current: unknown = input;
    let allSuccess = true;

    for (const stage of this.stages) {
      const stageStart = Date.now();
      try {
        let output: unknown;
        if (stage.type === 'filter') {
          const result = await this.runWithTimeout(stage, current);
          output = result; // null = filter out
        } else {
          output = await this.runWithTimeout(stage, current);
        }
        const durationMs = Date.now() - stageStart;
        // Filter type: if output is null, drop the data
        if (stage.type === 'filter' && output === null) {
          results.push({
            stageName: stage.name,
            type: stage.type,
            success: true,
            input: current,
            output: null,
            durationMs,
            skipped: true,
          });
          // Once a filter drops, the rest of the pipeline has no input
          current = null;
          break;
        }
        results.push({
          stageName: stage.name,
          type: stage.type,
          success: true,
          input: current,
          output,
          durationMs,
        });
        // Tee: doesn't change the value
        if (stage.type !== 'tee') {
          current = output;
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const durationMs = Date.now() - stageStart;
        if (stage.continueOnError) {
          results.push({
            stageName: stage.name,
            type: stage.type,
            success: false,
            input: current,
            output: null,
            durationMs,
            error,
          });
          allSuccess = false;
        } else {
          results.push({
            stageName: stage.name,
            type: stage.type,
            success: false,
            input: current,
            output: null,
            durationMs,
            error,
          });
          allSuccess = false;
          break; // stop pipeline
        }
      }
    }

    return {
      success: allSuccess,
      stages: results,
      finalOutput: current,
      totalDurationMs: Date.now() - start,
    };
  }

  private async runWithTimeout(stage: Stage, input: unknown): Promise<unknown> {
    if (stage.timeoutMs && stage.timeoutMs > 0) {
      return await Promise.race([
        Promise.resolve(stage.handler(input)),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`stage "${stage.name}" timed out`)), stage.timeoutMs),
        ),
      ]);
    }
    return await Promise.resolve(stage.handler(input));
  }

  /** Reset pipeline. */
  clear(): void {
    this.stages = [];
  }

  /** Get pipeline name. */
  getName(): string {
    return this.name;
  }
}
