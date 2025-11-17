export enum Sentiment {
  HAPPY = 'happy',
  SAD = 'sad',
  NEUTRAL = 'neutral',
  ANGRY = 'angry'
}

export interface Note {
  id: string
  text: string
  sentiment: Sentiment
  dateCreated: string
}

export interface NoteQueryResults {
  items: Note[]
  nextToken?: string
  scannedCount?: number
}

export interface CreateNoteInput {
  text: string
  sentiment: Sentiment
}

export interface GetNotesInput {
  sentiment?: Sentiment
  limit?: number
  nextToken?: string
}