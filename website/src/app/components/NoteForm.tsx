'use client'

import { useState } from 'react'
import { ulid } from 'ulid'
import { Note, Sentiment, CreateNoteInput } from '@/app/types'

interface NoteFormProps {
  onNoteCreated: (note: Note) => void
}

export default function NoteForm({ onNoteCreated }: NoteFormProps) {
  const [text, setText] = useState('')
  const [sentiment, setSentiment] = useState<Sentiment>(Sentiment.NEUTRAL)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) return

    setIsLoading(true)

    const newNote: Note = {
      id: ulid(),
      text: text.trim(),
      sentiment,
      dateCreated: new Date().toISOString()
    }

    try {
      onNoteCreated(newNote)
      setText('')
      setSentiment(Sentiment.NEUTRAL)
    } catch (error) {
      console.error('Error creating note:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
      case Sentiment.HAPPY: return 'bg-green-100 border-green-300 text-green-800'
      case Sentiment.SAD: return 'bg-blue-100 border-blue-300 text-blue-800'
      case Sentiment.ANGRY: return 'bg-red-100 border-red-300 text-red-800'
      case Sentiment.NEUTRAL: return 'bg-gray-100 border-gray-300 text-gray-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Create a New Note</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
            Your Note
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How are you feeling?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.values(Sentiment).map((sentimentOption) => (
              <button
                key={sentimentOption}
                type="button"
                onClick={() => setSentiment(sentimentOption)}
                className={`p-3 rounded-md border-2 transition-all duration-200 ${
                  sentiment === sentimentOption
                    ? getSentimentColor(sentimentOption)
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-2xl">{getSentimentEmoji(sentimentOption)}</span>
                  <span className="text-sm font-medium capitalize">{sentimentOption}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? 'Creating...' : 'Create Note'}
        </button>
      </form>
    </div>
  )
}