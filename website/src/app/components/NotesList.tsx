'use client'

import { Note } from '@/app/types'
import NoteCard from './NoteCard'

interface NotesListProps {
  notes: Note[]
  isLoading: boolean
  hasNextPage: boolean
  currentPage: number
  totalPages: number
  onNextPage: () => void
  onPrevPage: () => void
}

export default function NotesList({ notes, isLoading, hasNextPage, currentPage, totalPages, onNextPage, onPrevPage }: NotesListProps) {
  if (isLoading && notes.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📝</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No notes found</h3>
        <p className="text-gray-600">Start by creating your first note above!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="mt-8 flex justify-center items-center space-x-4">
        <button
          onClick={onPrevPage}
          disabled={currentPage <= 1 || isLoading}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Previous
        </button>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Page {currentPage}</span>
          {totalPages > 1 && <span>of {totalPages}</span>}
        </div>

        <button
          onClick={onNextPage}
          disabled={!hasNextPage || isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          <span>{isLoading ? 'Loading...' : 'Next'}</span>
        </button>
      </div>
    </div>
  )
}