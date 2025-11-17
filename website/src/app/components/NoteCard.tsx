'use client'

import { Note, Sentiment } from '@/app/types'

interface NoteCardProps {
  note: Note
}

export default function NoteCard({ note }: NoteCardProps) {
  const getSentimentEmoji = (sentiment: Sentiment) => {
    switch (sentiment) {
      case Sentiment.HAPPY: return '😊'
      case Sentiment.SAD: return '😢'
      case Sentiment.ANGRY: return '😠'
      case Sentiment.NEUTRAL: return '😐'
      default: return '😐'
    }
  }

  const getSentimentColor = (sentiment: Sentiment) => {
    switch (sentiment) {
      case Sentiment.HAPPY: return 'bg-green-50 border-l-green-400'
      case Sentiment.SAD: return 'bg-blue-50 border-l-blue-400'
      case Sentiment.ANGRY: return 'bg-red-50 border-l-red-400'
      case Sentiment.NEUTRAL: return 'bg-gray-50 border-l-gray-400'
      default: return 'bg-gray-50 border-l-gray-400'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 ${getSentimentColor(note.sentiment)} overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getSentimentEmoji(note.sentiment)}</span>
            <span className="text-sm font-medium text-gray-700 capitalize">
              {note.sentiment}
            </span>
          </div>
          <time className="text-sm text-gray-600">
            {formatDate(note.dateCreated)}
          </time>
        </div>

        <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
          {note.text}
        </p>
      </div>
    </div>
  )
}