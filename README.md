# Bluesky Post Composer for Markpub Websites

A React application for composing and posting to Bluesky with secure authentication and post URL capture.

## Features

- **Secure Authentication**: Login with Bluesky credentials using App Passwords
- **Real Posting**: Actually posts to your Bluesky account via AT Protocol API
- **Post URL Capture**: Displays the URL of your posted content
- **Character Limit Enforcement**: 300 character limit with real-time feedback
- **Session Persistence**: Secure credential storage and session management
- **Draft Persistence**: Local storage for unsent posts
- **Responsive Design**: Clean, mobile-friendly interface
- **Loading States**: Visual feedback during authentication and posting

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/bskypost-markpub.git
cd bskypost-markpub
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## How to Use

1. **Generate an App Password**: 
   - Go to Bluesky Settings → Privacy and Security → App Passwords
   - Create a new App Password (NOT your account password)

2. **Login**: 
   - Enter your Bluesky username/email and the App Password
   - Your session will be securely stored for future use

3. **Compose and Post**: 
   - Write your post (up to 300 characters)
   - Click "Post" to publish to Bluesky
   - The URL of your post will be displayed

## Security Features

- **App Password Authentication**: Uses App Passwords instead of account passwords
- **Secure Session Management**: Sessions are encrypted and stored locally
- **Automatic Session Renewal**: Handles token refresh automatically
- **No Password Storage**: App Passwords are never permanently stored

## Technical Details

This project was built with:
- React + TypeScript
- AT Protocol API (`@atproto/api`)
- Secure credential management
- LocalStorage for session persistence
- Responsive CSS design

## Future Enhancements

Potential improvements include:
- Support for rich text formatting and mentions
- Image and media upload functionality
- Thread composition support
- Post scheduling
- Multiple account management

## License

This project is open source and available under the [MIT License](LICENSE).
