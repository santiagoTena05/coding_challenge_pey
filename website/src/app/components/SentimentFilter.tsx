'use client'

import { Sentiment } from '@/app/types'

interface SentimentFilterProps {
  selectedSentiment?: Sentiment
  onSentimentChange: (sentiment?: Sentiment) => void
}

export default function SentimentFilter({ selectedSentiment, onSentimentChange }: SentimentFilterProps) {
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
      case Sentiment.HAPPY: return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
      case Sentiment.SAD: return 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
      case Sentiment.ANGRY: return 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
      case Sentiment.NEUTRAL: return 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
      default: return 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Filter by Sentiment</h3>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSentimentChange(undefined)}
          className={`px-3 py-2 rounded-full border transition-colors duration-200 ${
            selectedSentiment === undefined
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
        >
          <span className="text-sm font-medium">All Notes</span>
        </button>

        {Object.values(Sentiment).map((sentiment) => (
          <button
            key={sentiment}
            onClick={() => onSentimentChange(sentiment)}
            className={`px-3 py-2 rounded-full border transition-colors duration-200 flex items-center space-x-2 ${
              selectedSentiment === sentiment
                ? 'ring-2 ring-blue-400 ' + getSentimentColor(sentiment)
                : getSentimentColor(sentiment)
            }`}
          >
            <span>{getSentimentEmoji(sentiment)}</span>
            <span className="text-sm font-medium capitalize">{sentiment}</span>
          </button>
        ))}
      </div>
    </div>
  )
}