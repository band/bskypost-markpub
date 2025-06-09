import React, { useState, useEffect } from 'react';
import { AtpAgent } from '@atproto/api';
import './App.css';

const MAX_POST_LENGTH = 300; // Maximum length for a Bluesky post

function App() {
  // Load saved content from localStorage or use empty string as default
  const [postContent, setPostContent] = useState<string>(() => {
    const saved = localStorage.getItem('bluesky-post-content');
    return saved || '';
  });
  const [isAttachmentAdded, setIsAttachmentAdded] = useState<boolean>(false);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agent, setAgent] = useState<AtpAgent | null>(null);
  const [lastPostUrl, setLastPostUrl] = useState<string | null>(null);
  
  // Character count and limit
  const charCount = postContent.length;
  const remainingChars = MAX_POST_LENGTH - charCount;
  const isOverLimit = remainingChars < 0;

  // Save content to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bluesky-post-content', postContent);
  }, [postContent]);

  // Check for existing session on component mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const savedSession = localStorage.getItem('bluesky-session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          const newAgent = new AtpAgent({
            service: 'https://bsky.social',
          });
          
          await newAgent.resumeSession(sessionData);
          setAgent(newAgent);
          setIsAuthenticated(true);
        }
      } catch (error) {
        localStorage.removeItem('bluesky-session');
      }
    };
    
    checkExistingSession();
  }, []);

  // Handle text change in the textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostContent(e.target.value);
  };

  // Handle attachment toggle
  const handleAttachmentToggle = () => {
    setIsAttachmentAdded(!isAttachmentAdded);
  };

  // Clear the post content
  const handleClear = () => {
    setPostContent('');
    setIsAttachmentAdded(false);
  };

  // Handle authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const newAgent = new AtpAgent({
        service: 'https://bsky.social',
        persistSession: (evt, sess) => {
          if (sess) {
            localStorage.setItem('bluesky-session', JSON.stringify(sess));
          }
        },
      });

      await newAgent.login({
        identifier: username,
        password: password,
      });

      setAgent(newAgent);
      setIsAuthenticated(true);
      setPassword('');
    } catch (error) {
      alert('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('bluesky-session');
    setAgent(null);
    setIsAuthenticated(false);
    setUsername('');
    setLastPostUrl(null);
  };

  // Handle post submission
  const handleSubmit = async () => {
    if (isOverLimit || !agent) {
      alert('Your post exceeds the maximum character limit or you are not authenticated.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await agent.post({
        text: postContent,
        createdAt: new Date().toISOString(),
      });
      
      const postUrl = `https://bsky.app/profile/${agent.session?.did}/post/${response.uri.split('/').pop()}`;
      setLastPostUrl(postUrl);
      setPostContent('');
      setIsAttachmentAdded(false);
      
      alert(`Post successful! URL: ${postUrl}`);
    } catch (error) {
      alert('Failed to post. Please try again.');
      console.error('Post error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="composer-card">
        <div className="composer-body">
          <h1 className="composer-title">Bluesky Post Composer</h1>
          
          {!isAuthenticated ? (
            // Authentication form
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label htmlFor="username">Username or Email:</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username.bsky.social"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">App Password:</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  required
                  disabled={isLoading}
                />
              </div>
              <button type="submit" disabled={isLoading} className="login-button">
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              <p className="auth-note">
                Use an App Password, not your account password. Generate one at Settings → Privacy and Security → App Passwords.
              </p>
            </form>
          ) : (
            // Post composer (authenticated state)
            <>
              <div className="user-info">
                <span>Logged in as: {agent?.session?.handle}</span>
                <button onClick={handleLogout} className="logout-button">Logout</button>
              </div>
              
              {/* Post content textarea */}
              <div className="textarea-container">
                <textarea
                  className={`composer-textarea ${isOverLimit ? 'error' : ''}`}
                  placeholder="What's happening?"
                  rows={4}
                  value={postContent}
                  onChange={handleTextChange}
                  disabled={isLoading}
                />
                
                {/* Character counter */}
                <div className={`character-counter ${isOverLimit ? 'error' : ''}`}>
                  {charCount}/{MAX_POST_LENGTH} ({remainingChars >= 0 ? remainingChars : 0} remaining)
                </div>
              </div>
              
              {/* Post controls */}
              <div className="controls-container">
                {/* Attachment button */}
                <button 
                  className={`control-button ${isAttachmentAdded ? 'active' : ''}`}
                  onClick={handleAttachmentToggle}
                  disabled={isLoading}
                >
                  📎 {isAttachmentAdded ? 'Remove attachment' : 'Add attachment'}
                </button>
              </div>
              
              {/* Action buttons */}
              <div className="action-buttons">
                <button 
                  className="clear-button"
                  onClick={handleClear}
                  disabled={isLoading}
                >
                  Clear
                </button>
                <button 
                  className={`post-button ${isOverLimit || postContent.trim() === '' ? 'disabled' : ''}`}
                  onClick={handleSubmit}
                  disabled={isOverLimit || postContent.trim() === '' || isLoading}
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
              
              {/* Last post URL */}
              {lastPostUrl && (
                <div className="last-post-url">
                  <p>Last post: <a href={lastPostUrl} target="_blank" rel="noopener noreferrer">{lastPostUrl}</a></p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Updated info */}
      <div className="disclaimer">
        <p>{isAuthenticated ? 'Connected to Bluesky - posts will be published to your account.' : 'Login to post to Bluesky.'}</p>
      </div>
    </div>
  );
}

export default App;
