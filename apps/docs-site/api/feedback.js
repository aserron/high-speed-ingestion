// Vercel serverless function for handling feedback submissions
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { page, rating, type, comment, timestamp, userAgent } = req.body

    // Validate required fields
    if (!page || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid feedback data' })
    }

    // In a real implementation, you would:
    // 1. Store feedback in a database
    // 2. Send to analytics service (Google Analytics, Mixpanel, etc.)
    // 3. Send notifications for critical feedback
    
    console.log('Feedback received:', {
      page,
      rating,
      type,
      comment: comment?.substring(0, 100), // Log first 100 chars
      timestamp,
      userAgent: userAgent?.substring(0, 100)
    })

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100))

    // Example: Send to Google Analytics (if configured)
    if (process.env.GA_MEASUREMENT_ID) {
      try {
        const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`, {
          method: 'POST',
          body: JSON.stringify({
            client_id: 'docs-feedback',
            events: [{
              name: 'feedback_submitted',
              parameters: {
                page_location: page,
                rating: rating,
                feedback_type: type || 'general',
                has_comment: !!comment
              }
            }]
          })
        })
      } catch (error) {
        console.error('Failed to send to GA:', error)
      }
    }

    // Example: Send to Slack webhook (if configured)
    if (process.env.SLACK_WEBHOOK_URL && rating <= 2) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `📝 Low rating feedback received`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Page:* ${page}\n*Rating:* ${rating}/5 ⭐\n*Type:* ${type || 'general'}\n*Comment:* ${comment || 'No comment'}`
                }
              }
            ]
          })
        })
      } catch (error) {
        console.error('Failed to send to Slack:', error)
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Feedback received successfully' 
    })

  } catch (error) {
    console.error('Feedback processing error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process feedback'
    })
  }
}