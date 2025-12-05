'use client'

import { useState, useEffect } from 'react'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import { Note, Sentiment } from '@/app/types'
import NoteForm from '@/app/components/NoteForm'
import SentimentFilter from '@/app/components/SentimentFilter'
import NotesList from '@/app/components/NotesList'
import { createNoteMutation, getNotesQuery } from '@/app/lib/graphql/operations'
import awsConfig from '../aws-exports'

Amplify.configure(awsConfig)
const client = generateClient({ authMode: 'apiKey' })

// Mock data for display (until resolvers are fully working)
const mockNotes: Note[] = [
  {
    id: "01KA82YS8XM5ZAXF123",
    text: "Had an amazing day at the beach! The sunset was absolutely beautiful and I felt so peaceful.",
    sentiment: Sentiment.HAPPY,
    dateCreated: '2024-11-15T18:30:00Z'
  },
  {
    id: "01KA82YS8XM5ZAXF456",
    text: "Feeling overwhelmed with work deadlines. Everything seems to be happening at once.",
    sentiment: Sentiment.SAD,
    dateCreated: '2024-11-15T14:20:00Z'
  },
  {
    id: "01KA82YS8XM5ZAXF789",
    text: "Just another day. Nothing special happened, but nothing bad either.",
    sentiment: Sentiment.NEUTRAL,
    dateCreated: '2024-11-15T10:15:00Z'
  },
  {
    id: "01KA82YS8XM5ZAXF012",
    text: "Traffic was terrible this morning! Spent 2 hours in what should have been a 30-minute drive.",
    sentiment: Sentiment.ANGRY,
    dateCreated: '2024-11-15T08:45:00Z'
  }
]

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [nextToken, setNextToken] = useState<string | undefined>(undefined)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Load notes from both AWS and localStorage
  useEffect(() => {
    // Clear localStorage on page load for testing
    localStorage.removeItem('notes-app-data')
    loadAllNotes()
  }, [])

  const loadAllNotes = async (loadMore: boolean = false, sentiment?: Sentiment) => {
    setIsLoading(true)

    try {
      // Try to load notes from AWS DynamoDB with pagination
      let awsNotes: Note[] = []
      let newNextToken: string | undefined = undefined

      try {
        console.log('🔍 Fetching notes from AWS DynamoDB...', sentiment ? `with filter: ${sentiment}` : 'no filter')
        const variables: any = {
          sentiment: sentiment,
          nextToken: loadMore ? nextToken : undefined
        }

        // Always use limit of 10 for consistent pagination
        variables.limit = 10

        const result = await client.graphql({
          query: getNotesQuery,
          variables: variables,
          authMode: 'apiKey'
        }) as any

        if (result.data?.getNotes) {
          awsNotes = result.data.getNotes.items || []
          newNextToken = result.data.getNotes.nextToken
          setNextToken(newNextToken)
          setHasNextPage(!!newNextToken)

          // Calculate total pages estimate based on scannedCount
          if (result.data.getNotes.scannedCount && !loadMore) {
            const estimatedTotal = result.data.getNotes.scannedCount
            setTotalPages(Math.ceil(estimatedTotal / 10))
          }

          console.log('✅ Loaded', awsNotes.length, 'notes from AWS DynamoDB')
        }
      } catch (awsError) {
        console.log('⚠️ AWS fetch failed, loading from localStorage only')
        console.error('AWS Error:', awsError)
      }

      // Load notes from localStorage (fallback)
      let localNotes: Note[] = []
      try {
        const savedNotes = localStorage.getItem('notes-app-data')
        if (savedNotes) {
          localNotes = JSON.parse(savedNotes)
          console.log('✅ Loaded', localNotes.length, 'notes from localStorage')

          // Apply sentiment filter to local notes if specified
          if (sentiment) {
            localNotes = localNotes.filter(note => note.sentiment === sentiment)
          }
        }
      } catch (error) {
        console.log('localStorage read failed')
      }

      // Combine and deduplicate notes
      const allNotes = [...awsNotes, ...localNotes]
      const uniqueNotes = allNotes.filter((note, index, self) =>
        index === self.findIndex(n => n.id === note.id)
      )

      // Always replace notes for pagination (no more "load more" behavior)
      setNotes(uniqueNotes)

      console.log('📝 Total notes loaded:', uniqueNotes.length)

    } catch (error) {
      console.error('Error loading notes:', error)
      if (!loadMore) {
        setNotes([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const saveNotesToStorage = (notesToSave: Note[]) => {
    try {
      const userNotes = notesToSave.filter(note =>
        !mockNotes.find(mockNote => mockNote.id === note.id)
      )
      localStorage.setItem('notes-app-data', JSON.stringify(userNotes))
    } catch (error) {
      console.log('Could not save to localStorage')
    }
  }

  const handleNoteCreated = async (newNote: Note) => {
    try {
      console.log('Creating note:', newNote.text)

      // Try to save to AWS DynamoDB
      let awsSaved = false
      try {
        await client.graphql({
          query: createNoteMutation,
          variables: {
            text: newNote.text,
            sentiment: newNote.sentiment
          },
          authMode: 'apiKey'
        }) as any
        console.log('✅ Note saved to AWS DynamoDB!')
        awsSaved = true
      } catch (awsError) {
        console.log('⚠️ AWS save failed (resolver issues), but saved locally')
        console.error('AWS Error:', awsError)
      }

      if (awsSaved) {
        // If AWS save was successful, reload all notes to see the new one
        await loadAllNotes()
      } else {
        // If AWS failed, save locally and update UI
        const updatedNotes = [newNote, ...notes]
        setNotes(updatedNotes)
        saveNotesToStorage(updatedNotes)
      }

      console.log('✅ Note saved and displayed!')
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const handleSentimentChange = (sentiment?: Sentiment) => {
    setSelectedSentiment(sentiment)
    setNotes([]) // Clear existing notes
    setNextToken(undefined) // Reset pagination
    setCurrentPage(1) // Reset to first page
    loadAllNotes(false, sentiment) // Load fresh data with filter
  }

  const handleNextPage = () => {
    if (hasNextPage && !isLoading) {
      setCurrentPage(prev => prev + 1)
      loadAllNotes(true, selectedSentiment)
    }
  }

  const handlePrevPage = () => {
    // For simplicity, we'll reload from the beginning and paginate
    // This is a limitation of DynamoDB's cursor-based pagination
    if (currentPage > 1 && !isLoading) {
      setCurrentPage(prev => prev - 1)
      // Reset and reload (DynamoDB limitation - no true "previous" with cursor pagination)
      setNextToken(undefined)
      setNotes([])
      loadAllNotes(false, selectedSentiment)
    }
  }

  // Notes are already filtered by the backend when selectedSentiment is used
  const filteredNotes = notes

  const sortedNotes = filteredNotes.sort((a, b) =>
    new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📝 Notes with Sentiments
          </h1>
          <p className="text-gray-600">
            Share your thoughts and feelings with the world
          </p>
        </header>

        <NoteForm onNoteCreated={handleNoteCreated} />

        <SentimentFilter
          selectedSentiment={selectedSentiment}
          onSentimentChange={handleSentimentChange}
        />

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-700">
            {selectedSentiment
              ? `${filteredNotes.length} ${selectedSentiment} notes`
              : `${notes.length} total notes`
            }
          </h2>
        </div>

        <NotesList
          notes={sortedNotes}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          currentPage={currentPage}
          totalPages={totalPages}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
        />
      </div>
    </div>
  )
}