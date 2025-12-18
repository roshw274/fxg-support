# Feedback System Documentation

## Overview
The enhanced feedback system allows users to provide detailed feedback about their ticket experience with staff members. The system includes star ratings (1-5 stars) and detailed written feedback through a modal form.

## Features

### 1. Star Rating Interface
- **Visual Design**: Matches the style shown in the provided image
- **5-Star Scale**: Users can rate from 1 star (Poor) to 5 stars (Excellent)
- **Interactive Buttons**: Each star rating is a clickable button

### 2. Detailed Feedback Form
- **Modal Interface**: After clicking a star rating, users see a modal form
- **Text Input**: Users can provide detailed written feedback (up to 1000 characters)
- **Required Field**: Detailed feedback is mandatory to submit

### 3. Database Storage
- **MongoDB Integration**: All feedback is stored in a dedicated collection
- **Comprehensive Data**: Stores rating, feedback text, user info, staff info, and metadata
- **Timestamp Tracking**: Records when feedback was submitted

### 4. Staff Statistics
- **Feedback Analytics**: View overall and per-staff feedback statistics
- **Rating Distribution**: See breakdown of 1-5 star ratings
- **Average Ratings**: Calculate average rating scores
- **Recent Feedback**: View latest feedback submissions

## Commands

### `/feedback`
- **Description**: Send a feedback request with star rating interface
- **Usage**: Can only be used in ticket channels
- **Features**: 
  - Displays personalized message with ticket ID and staff member
  - Shows 5 star rating buttons
  - Matches the visual style from the provided image

### `/feedbackstats`
- **Description**: View feedback statistics for staff members
- **Usage**: Requires Staff or High Staff role
- **Options**:
  - `staff` (optional): Specific staff member to view stats for
- **Features**:
  - Total feedback count
  - Average rating calculation
  - Rating distribution breakdown
  - Recent feedback preview

## Database Schema

### Feedback Collection
```javascript
{
  ticketId: String,        // Channel ID of the ticket
  userId: String,          // User who submitted feedback
  staffId: String,         // Staff member who handled the ticket
  rating: Number,          // 1-5 star rating
  feedback: String,        // Detailed feedback text (max 1000 chars)
  guildId: String,         // Server ID
  channelName: String,     // Name of the ticket channel
  createdAt: Date          // When feedback was submitted
}
```

## Integration Points

### Ticket Closing
- When a ticket is closed using `/close`, the system automatically sends a feedback request to the ticket opener via DM
- The feedback request includes the ticket ID and staff member who handled it
- Uses the same visual style as the manual feedback command

### Event Handlers
- **Button Interactions**: Handles star rating button clicks
- **Modal Submissions**: Processes detailed feedback form submissions
- **Database Operations**: Saves feedback data and logs to feedback channel

## Visual Design

The feedback system matches the provided image with:
- **Title**: "How do you rate our help?"
- **Personalized Message**: Includes user mention, ticket ID, server name, and staff member
- **24-Hour Notice**: Informs users they have 24 hours to provide feedback
- **Star Buttons**: 5 buttons labeled 1-5 with star emojis
- **Professional Styling**: Clean, modern Discord embed design

## Error Handling

- **Permission Checks**: Ensures only authorized users can access feedback features
- **Channel Validation**: Verifies commands are used in appropriate channels
- **Database Errors**: Graceful handling of database connection and save errors
- **User Notifications**: Clear error messages for users when issues occur

## Future Enhancements

Potential improvements could include:
- Feedback response system for staff to reply to feedback
- Automated feedback reminders
- Feedback analytics dashboard
- Integration with staff performance tracking
- Feedback export functionality
