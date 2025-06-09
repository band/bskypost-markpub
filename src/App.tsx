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
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agent, setAgent] = useState<AtpAgent | null>(null);
  const [lastPostUrl, setLastPostUrl] = useState<string | null>(null);
  const [urlPreview, setUrlPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  
  // Character count and limit (URLs count as 23 chars for Bluesky when embedded)
  const calculateCharCount = () => {
    let count = postContent.length;
    
    if (websiteUrl.trim()) {
      const urlToEmbed = websiteUrl.trim();
      // If URL is not already in the post content, it will be added (and counts as 23 chars when embedded)
      if (!postContent.includes(urlToEmbed)) {
        // Add length for line breaks and the URL itself (which will be shortened to 23 chars when embedded)
        const lineBreaks = postContent.trim() ? 2 : 0; // \n\n if there's existing content
        count += lineBreaks + 23; // URLs are shortened to 23 chars in Bluesky
      }
    }
    
    return count;
  };
  
  const charCount = calculateCharCount();
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

  // Handle website URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newUrl = e.target.value;
    setWebsiteUrl(newUrl);
    
    // Clear existing preview if URL is empty
    if (!newUrl.trim()) {
      setUrlPreview(null);
      return;
    }
    
    // Debounce URL preview fetching
    const timer = setTimeout(async () => {
      try {
        // Basic URL validation
        const url = new URL(newUrl.trim());
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          setIsLoadingPreview(true);
          const metadata = await fetchUrlMetadata(newUrl.trim());
          setUrlPreview(metadata);
        }
      } catch (error) {
        setUrlPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  };

  // Clear the post content
  const handleClear = () => {
    setPostContent('');
    setWebsiteUrl('');
    setUrlPreview(null);
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

  // Fetch metadata for URL embedding
  const fetchUrlMetadata = async (url: string) => {
    try {
      const response = await fetch(`https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch URL metadata:', error);
      return null;
    }
  };

  // Handle post submission
  const handleSubmit = async () => {
    if (isOverLimit || !agent) {
      alert('Your post exceeds the maximum character limit or you are not authenticated.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let postData: any = {
        text: postContent,
        createdAt: new Date().toISOString(),
      };

      // If there's a URL, try to embed it with metadata
      if (websiteUrl.trim()) {
        const urlToEmbed = websiteUrl.trim();
        
        // Add URL to the text if it's not already there
        let finalText = postContent;
        if (!postContent.includes(urlToEmbed)) {
          finalText = postContent.trim() + (postContent.trim() ? '\n\n' : '') + urlToEmbed;
        }
        
        // Try to fetch metadata for rich embedding
        const metadata = await fetchUrlMetadata(urlToEmbed);
        
        if (metadata && metadata.title) {
          // Create embedded link with metadata
          postData.embed = {
            $type: 'app.bsky.embed.external',
            external: {
              uri: urlToEmbed,
              title: metadata.title || '',
              description: metadata.description || '',
              thumb: metadata.image ? {
                $type: 'blob',
                ref: {
                  $link: metadata.image
                },
                mimeType: 'image/jpeg',
                size: 0
              } : undefined
            }
          };
        }
        
        postData.text = finalText;
      }
      
      const response = await agent.post(postData);
      
      const postUrl = `https://bsky.app/profile/${agent.session?.did}/post/${response.uri.split('/').pop()}`;
      setLastPostUrl(postUrl);
      setPostContent('');
      setWebsiteUrl('');
      
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
              
              {/* Website URL input */}
              <div className="url-container">
                <label htmlFor="website-url">Website URL (optional):</label>
                <textarea
                  id="website-url"
                  className="url-textarea"
                  placeholder="https://example.com"
                  rows={2}
                  value={websiteUrl}
                  onChange={handleUrlChange}
                  disabled={isLoading}
                />
                {websiteUrl.trim() && (
                  <div className="url-char-info">
                    URLs count as 23 characters
                  </div>
                )}
                
                {/* URL Preview */}
                {isLoadingPreview && (
                  <div className="url-preview loading">
                    <div className="preview-text">Loading preview...</div>
                  </div>
                )}
                
                {urlPreview && !isLoadingPreview && (
                  <div className="url-preview">
                    <div className="preview-header">Link Preview:</div>
                    <div className="preview-card">
                      {urlPreview.image && (
                        <img 
                          src={urlPreview.image} 
                          alt="Link preview" 
                          className="preview-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="preview-content">
                        <div className="preview-title">{urlPreview.title || 'No title'}</div>
                        {urlPreview.description && (
                          <div className="preview-description">{urlPreview.description}</div>
                        )}
                        <div className="preview-domain">{websiteUrl}</div>
                      </div>
                    </div>
                  </div>
                )}
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
