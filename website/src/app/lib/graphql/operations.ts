export const createNoteMutation = `
  mutation CreateNote($text: String!, $sentiment: Sentiment!) {
    createNote(text: $text, sentiment: $sentiment) {
      id
      text
      sentiment
      dateCreated
    }
  }
`

export const getNotesQuery = `
  query GetNotes($sentiment: Sentiment, $limit: Int, $nextToken: String) {
    getNotes(sentiment: $sentiment, limit: $limit, nextToken: $nextToken) {
      items {
        id
        text
        sentiment
        dateCreated
      }
      nextToken
      scannedCount
    }
  }
`