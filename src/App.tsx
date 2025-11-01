import React, { useState, FormEvent, ChangeEvent, useRef } from 'react';

type TabType = 'redesign' | 'suggest' | 'customization' | 'custom-prompt';

// Backend valid styles
const VALID_STYLES = [
  { value: 'coastal_beachy', label: 'Coastal Beachy' },
  { value: 'mid_century_modern', label: 'Mid Century Modern' },
  { value: 'rustic_bohemian', label: 'Rustic Bohemian' },
  { value: 'scandinavian_minimalist', label: 'Scandinavian Minimalist' },
  { value: 'industrial_modern', label: 'Industrial Modern' },
  { value: 'farmhouse_chic', label: 'Farmhouse Chic' },
  { value: 'art_deco_glamour', label: 'Art Deco Glamour' },
  { value: 'mediterranean_villa', label: 'Mediterranean Villa' },
  { value: 'modern_luxury', label: 'Modern Luxury' },
  { value: 'japanese_zen', label: 'Japanese Zen' },
  { value: 'victorian_elegant', label: 'Victorian Elegant' },
  { value: 'tropical_modern', label: 'Tropical Modern' },
];

// Valid room types
const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining_room', label: 'Dining Room' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'office', label: 'Office' },
];

function App() {
  // State Management
  const [activeTab, setActiveTab] = useState<TabType>('redesign');
  const [prompt, setPrompt] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [redesignedImage, setRedesignedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Customization options
  const [selectedStyle, setSelectedStyle] = useState<string>('modern_luxury');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('living_room');
  
  // Custom prompt
  const [customPromptText, setCustomPromptText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'redesign' as TabType, label: 'Redesign', icon: '🎨', desc: 'Transform your space' },
    { id: 'suggest' as TabType, label: 'Suggest', icon: '💡', desc: 'Get AI suggestions' },
    { id: 'customization' as TabType, label: 'Customization', icon: '⚙️', desc: 'Fine-tune details' },
    { id: 'custom-prompt' as TabType, label: 'Custom Prompt', icon: '✨', desc: 'Advanced control' },
  ];

  // Poll prediction status until completed
  const pollPredictionStatus = async (predictionId: string, apiBaseUrl: string) => {
    const maxAttempts = 60; // Poll for up to 60 attempts (2 minutes if 2s intervals)
    let attempts = 0;

    const poll = async (): Promise<string | null> => {
      if (attempts >= maxAttempts) {
        throw new Error('Prediction took too long. Please try again.');
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/get-redesign?id=${predictionId}`);
        if (!response.ok) {
          throw new Error(`Failed to get prediction status: ${response.status}`);
        }

        const prediction = await response.json();

        if (prediction.status === 'succeeded' && prediction.output) {
          const imageUrl = Array.isArray(prediction.output) 
            ? prediction.output[0] 
            : prediction.output;
          return imageUrl;
        } else if (prediction.status === 'failed' || prediction.error) {
          throw new Error(prediction.error || 'Prediction failed');
        } else if (prediction.status === 'canceled') {
          throw new Error('Prediction was canceled');
        }

        // Still processing, wait and poll again
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return poll();
      } catch (error) {
        throw error;
      }
    };

    const imageUrl = await poll();
    if (imageUrl) {
      setRedesignedImage(imageUrl);
    }
  };

  // Handle file selection - store both File object and preview
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Store the File object for upload
    setSelectedFile(file);
    
    // Create preview for display
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setOriginalImage(result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile || !originalImage) {
      setError('Please upload an image');
      return;
    }

    // Determine style based on active tab
    let style = selectedStyle;
    let roomType = selectedRoomType;

    // For redesign and custom-prompt tabs, use default style if none selected
    if ((activeTab === 'redesign' || activeTab === 'custom-prompt') && !selectedStyle) {
      style = 'modern_luxury';
    }

    setIsLoading(true);
    setError(null);
    setRedesignedImage(null);
    setSuggestions([]);

    try {
      // API base URL - defaults to localhost:3001, can be overridden with env variable
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      // Prepare userPrompt based on active tab
      let userPromptValue = '';
      if (activeTab === 'redesign') {
        userPromptValue = prompt.trim() || `Apply ${VALID_STYLES.find(s => s.value === style)?.label || style} style to this room`;
      } else if (activeTab === 'custom-prompt') {
        userPromptValue = customPromptText.trim() || `Apply ${VALID_STYLES.find(s => s.value === style)?.label || style} style to this room`;
      } else if (activeTab === 'customization') {
        userPromptValue = `Apply ${VALID_STYLES.find(s => s.value === style)?.label || style} style to this ${ROOM_TYPES.find(r => r.value === roomType)?.label || roomType}`;
      } else if (activeTab === 'suggest') {
        userPromptValue = `Apply ${VALID_STYLES.find(s => s.value === style)?.label || style} style to this ${ROOM_TYPES.find(r => r.value === roomType)?.label || roomType}`;
      }

      // Send base64 image string as JSON (backend expects base64 string, not file)
      const response = await fetch(`${API_BASE_URL}/api/start-redesign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: originalImage, // This is the base64 data URL from FileReader
          userPrompt: userPromptValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
      }

      const prediction = await response.json();
      
      // Backend returns a prediction object (from Replicate predictions.create)
      // We need to poll for the result if it's not complete yet
      if (prediction.status === 'succeeded' && prediction.output) {
        // Prediction completed immediately
        const imageUrl = Array.isArray(prediction.output) 
          ? prediction.output[0] 
          : prediction.output;
        setRedesignedImage(imageUrl);
      } else if (prediction.status === 'starting' || prediction.status === 'processing') {
        // Need to poll for result
        await pollPredictionStatus(prediction.id, API_BASE_URL);
      } else if (prediction.error) {
        throw new Error(prediction.error || 'Prediction failed');
      } else {
        // Fallback: try to extract URL from any output field
        const imageUrl = prediction.output || prediction.urls?.get || prediction.imageUrl;
        if (imageUrl) {
          setRedesignedImage(imageUrl);
        } else {
          throw new Error('No image URL returned from server');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 text-transparent bg-clip-text mb-3 animate-pulse">
            DreamSpace AI
          </h1>
          <p className="text-gray-300 text-lg">
            Transform your space with the power of artificial intelligence
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/50'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
              }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="font-semibold text-sm md:text-base">{tab.label}</div>
              <div className="text-xs text-gray-300 mt-1 hidden md:block">{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8 shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload - Common for all tabs */}
            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-2 text-gray-200">
                📸 Upload Room Photo
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-4 bg-gray-900/50 border-2 border-gray-600 rounded-xl file:mr-4 file:py-2 file:px-6 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white file:font-semibold file:cursor-pointer hover:file:from-purple-700 hover:file:to-pink-700 transition cursor-pointer hover:border-purple-500"
                />
              </div>
            </div>

            {/* Room Type Selection - Common for all tabs */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">
                🏠 Room Type
              </label>
              <select
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              >
                {ROOM_TYPES.map((room) => (
                  <option key={room.value} value={room.value}>
                    {room.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab-specific content */}
            {activeTab === 'redesign' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">🎭 Design Style</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  >
                    {VALID_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium mb-2 text-gray-200">
                    🎨 Design Prompt (Optional)
                  </label>
                  <input
                    id="prompt"
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Add warm wooden tones and plants"
                    className="w-full px-4 py-4 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder-gray-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'suggest' && (
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-purple-300">💡 AI Suggestion Mode</h3>
                  <p className="text-gray-300 text-sm">
                    Upload your room photo and get a redesigned version with a default style. The AI will transform your space with Modern Luxury style.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">🎭 Design Style</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  >
                    {VALID_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'customization' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">🎭 Design Style</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  >
                    {VALID_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-4">
                  <p className="text-sm text-gray-300">
                    💡 Select your preferred design style. The AI will transform your room according to the chosen aesthetic.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'custom-prompt' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">🎭 Design Style</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  >
                    {VALID_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="custom-prompt" className="block text-sm font-medium mb-2 text-gray-200">
                    ✨ Advanced Custom Prompt
                  </label>
                  <textarea
                    id="custom-prompt"
                    value={customPromptText}
                    onChange={(e) => setCustomPromptText(e.target.value)}
                    placeholder="Describe your vision in detail... Include colors, materials, lighting, atmosphere, and any specific elements you want."
                    rows={5}
                    className="w-full px-4 py-4 bg-gray-900/50 border-2 border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition placeholder-gray-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border-2 border-red-600 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl font-bold text-lg hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-500/50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : (
                `Generate ${tabs.find(t => t.id === activeTab)?.label}`
              )}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {activeTab === 'suggest' && suggestions.length > 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
              💡 AI Suggestions
            </h2>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 border border-purple-700/30 rounded-xl p-4 hover:border-purple-500 transition-all duration-300"
                >
                  <p className="text-gray-200">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Image Column */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📷</span> Original
              </h2>
              {originalImage ? (
                <img
                  src={originalImage}
                  alt="Original room"
                  className="w-full rounded-xl border-2 border-gray-600 shadow-lg hover:shadow-xl transition-shadow duration-300"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-gray-500">No image uploaded</p>
                  </div>
                </div>
              )}
            </div>

            {/* Redesigned Image Column */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>✨</span> Result
              </h2>
              {isLoading ? (
                <div className="w-full aspect-square bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-600 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-purple-300 font-semibold animate-pulse">Creating your dream space...</p>
                  </div>
                </div>
              ) : redesignedImage ? (
                <img
                  src={redesignedImage}
                  alt="Redesigned room"
                  className="w-full rounded-xl border-2 border-purple-600 shadow-lg shadow-purple-900/50 hover:shadow-purple-700/70 transition-all duration-300 hover:scale-[1.02]"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🌟</div>
                    <p className="text-gray-500">Your result will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pb-4">
          <p className="text-gray-400 text-lg font-bold">
            Powered by <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text font-bold">Cursor</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
