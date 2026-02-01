// ============================================================================
// ASSESSMENT VALUE OBJECT
// Clinical assessment with validation
// ============================================================================

import { UserId } from './UserId'

export class Assessment {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly results: Record<string, any>,
    public readonly summary: string,
    public readonly recommendations: string[],
    public readonly date: Date,
    public readonly assessedBy: UserId
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Assessment ID cannot be empty')
    }

    if (!type || type.trim().length === 0) {
      throw new Error('Assessment type cannot be empty')
    }

    if (!summary || summary.trim().length === 0) {
      throw new Error('Assessment summary cannot be empty')
    }

    if (summary.length > 1000) {
      throw new Error('Assessment summary cannot exceed 1000 characters')
    }

    if (date > new Date()) {
      throw new Error('Assessment date cannot be in the future')
    }

    if (recommendations.length === 0) {
      throw new Error('Assessment must have at least one recommendation')
    }

    // Validate recommendations
    for (const recommendation of recommendations) {
      if (!recommendation || recommendation.trim().length === 0) {
        throw new Error('Assessment recommendations cannot be empty')
      }
      if (recommendation.length > 200) {
        throw new Error('Each assessment recommendation cannot exceed 200 characters')
      }
    }
  }

  equals(other: Assessment): boolean {
    return (
      this.id === other.id &&
      this.type === other.type &&
      JSON.stringify(this.results) === JSON.stringify(other.results) &&
      this.summary === other.summary &&
      JSON.stringify(this.recommendations) === JSON.stringify(other.recommendations) &&
      this.date.getTime() === other.date.getTime() &&
      this.assessedBy.equals(other.assessedBy)
    )
  }
}