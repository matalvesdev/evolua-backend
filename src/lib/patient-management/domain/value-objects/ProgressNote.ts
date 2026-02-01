// ============================================================================
// PROGRESS NOTE VALUE OBJECT
// Clinical progress note with validation
// ============================================================================

import { UserId } from './UserId'

export class ProgressNote {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly createdAt: Date,
    public readonly createdBy: UserId,
    public readonly sessionDate: Date,
    public readonly category: 'assessment' | 'treatment' | 'observation' | 'goal_progress'
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Progress note ID cannot be empty')
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Progress note content cannot be empty')
    }

    if (content.length > 2000) {
      throw new Error('Progress note content cannot exceed 2000 characters')
    }

    if (sessionDate > new Date()) {
      throw new Error('Session date cannot be in the future')
    }

    if (createdAt > new Date()) {
      throw new Error('Creation date cannot be in the future')
    }

    const validCategories = ['assessment', 'treatment', 'observation', 'goal_progress']
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid progress note category: ${category}`)
    }
  }

  getCategoryDisplayName(): string {
    const displayNames = {
      'assessment': 'Avaliação',
      'treatment': 'Tratamento',
      'observation': 'Observação',
      'goal_progress': 'Progresso de Metas'
    }
    
    return displayNames[this.category]
  }

  equals(other: ProgressNote): boolean {
    return (
      this.id === other.id &&
      this.content === other.content &&
      this.createdAt.getTime() === other.createdAt.getTime() &&
      this.createdBy.equals(other.createdBy) &&
      this.sessionDate.getTime() === other.sessionDate.getTime() &&
      this.category === other.category
    )
  }
}