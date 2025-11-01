import React, { useState, FormEvent, ChangeEvent, useRef } from "react";

type TabType = "redesign" | "suggest" | "customization" | "custom-prompt";

// Backend valid styles
const VALID_STYLES = [
  { value: "coastal_beachy", label: "Coastal Beachy" },
  { value: "mid_century_modern", label: "Mid Century Modern" },
  { value: "rustic_bohemian", label: "Rustic Bohemian" },
  { value: "scandinavian_minimalist", label: "Scandinavian Minimalist" },
  { value: "industrial_modern", label: "Industrial Modern" },
  { value: "farmhouse_chic", label: "Farmhouse Chic" },
  { value: "art_deco_glamour", label: "Art Deco Glamour" },
  { value: "mediterranean_villa", label: "Mediterranean Villa" },
  { value: "modern_luxury", label: "Modern Luxury" },
  { value: "japanese_zen", label: "Japanese Zen" },
  { value: "victorian_elegant", label: "Victorian Elegant" },
  { value: "tropical_modern", label: "Tropical Modern" },
];

// Valid room types
const ROOM_TYPES = [
  { value: "living_room", label: "Living Room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "dining_room", label: "Dining Room" },
  { value: "bathroom", label: "Bathroom" },
  { value: "office", label: "Office" },
];

function App() {
  // State Management
  const [activeTab, setActiveTab] = useState<TabType>("redesign");
  const [prompt, setPrompt] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [redesignedImage, setRedesignedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Customization options
  const [selectedStyle, setSelectedStyle] = useState<string>("modern_luxury");
  const [selectedRoomType, setSelectedRoomType] =
    useState<string>("living_room");

  // Custom prompt
  const [customPromptText, setCustomPromptText] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    {
      id: "redesign" as TabType,
      label: "Redesign",
      icon: "🎨",
      desc: "Transform your space",
    },
    {
      id: "suggest" as TabType,
      label: "Suggest",
      icon: "💡",
      desc: "Get AI suggestions",
    },
    {
      id: "customization" as TabType,
      label: "Customization",
      icon: "⚙️",
      desc: "Fine-tune details",
    },
    {
      id: "custom-prompt" as TabType,
      label: "Custom Prompt",
      icon: "✨",
      desc: "Advanced control",
    },
  ];

  // Clear form and reset state
  const handleReset = () => {
    setOriginalImage(null);
    setSelectedFile(null);
    setRedesignedImage(null);
    setError(null);
    setPrompt("");
    setCustomPromptText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download redesigned image
  const handleDownload = async () => {
    if (!redesignedImage) return;

    try {
      const response = await fetch(redesignedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dreamspace-redesign-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download image:", err);
      setError("Failed to download image");
    }
  };

  // Handle file selection - store both File object and preview
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
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
      setError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile || !originalImage) {
      setError("Please upload an image");
      return;
    }

    // Determine style based on active tab
    let style = selectedStyle;
    let roomType = selectedRoomType;

    // For redesign and custom-prompt tabs, use default style if none selected
    if (
      (activeTab === "redesign" || activeTab === "custom-prompt") &&
      !selectedStyle
    ) {
      style = "modern_luxury";
    }

    setIsLoading(true);
    setError(null);
    setRedesignedImage(null);

    try {
      // API base URL - defaults to localhost:3001, can be overridden with env variable
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

      // Prepare userPrompt based on active tab
      let userPromptValue = "";
      if (activeTab === "redesign") {
        userPromptValue =
          prompt.trim() ||
          `Apply ${
            VALID_STYLES.find((s) => s.value === style)?.label || style
          } style to this room`;
      } else if (activeTab === "custom-prompt") {
        userPromptValue =
          customPromptText.trim() ||
          `Apply ${
            VALID_STYLES.find((s) => s.value === style)?.label || style
          } style to this room`;
      } else if (activeTab === "customization") {
        userPromptValue = `Apply ${
          VALID_STYLES.find((s) => s.value === style)?.label || style
        } style to this ${
          ROOM_TYPES.find((r) => r.value === roomType)?.label || roomType
        }`;
      } else if (activeTab === "suggest") {
        userPromptValue = `Apply ${
          VALID_STYLES.find((s) => s.value === style)?.label || style
        } style to this ${
          ROOM_TYPES.find((r) => r.value === roomType)?.label || roomType
        }`;
      }

      // Send base64 image string as JSON (backend expects base64 string, not file)
      const response = await fetch(`${API_BASE_URL}/api/start-redesign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: originalImage, // This is the base64 data URL from FileReader
          userPrompt: userPromptValue,
          style: style, // Send style to backend
          roomType: roomType, // Send roomType to backend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.details ||
            `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      // Backend now uses replicate.run() which returns result directly (no polling needed)
      if (data.success && data.imageUrl) {
        setRedesignedImage(data.imageUrl);
      } else if (data.imageUrl) {
        setRedesignedImage(data.imageUrl);
      } else if (data.output) {
        setRedesignedImage(data.output);
      } else {
        throw new Error("No image URL returned from server");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process request"
      );
      console.error("Error:", err);
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
                  ? "bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/50"
                  : "bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700"
              }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="font-semibold text-sm md:text-base">
                {tab.label}
              </div>
              <div className="text-xs text-gray-300 mt-1 hidden md:block">
                {tab.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 md:p-8 shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload - Common for all tabs */}
            <div>
              <label
                htmlFor="file"
                className="block text-sm font-medium mb-2 text-gray-200"
              >
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
              {originalImage && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-green-400">
                    ✓ Image uploaded
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    Clear
                  </button>
                </div>
              )}
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
            {activeTab === "redesign" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    🎭 Design Style
                  </label>
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
                  <label
                    htmlFor="prompt"
                    className="block text-sm font-medium mb-2 text-gray-200"
                  >
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

            {activeTab === "suggest" && (
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-purple-300">
                    💡 AI Suggestion Mode
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Upload your room photo and get a redesigned version based on
                    your selected style. The AI will transform your space
                    according to your preferences.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    🎭 Design Style
                  </label>
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
                <div className="bg-purple-800/30 border border-purple-600/50 rounded-lg p-3">
                  <p className="text-xs text-purple-200">
                    💡 Tip: The AI will analyze your room and suggest
                    improvements based on the selected style. The result will
                    show a complete redesign of your space.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "customization" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    🎭 Design Style
                  </label>
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
                    💡 Select your preferred design style. The AI will transform
                    your room according to the chosen aesthetic.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "custom-prompt" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">
                    🎭 Design Style
                  </label>
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
                  <label
                    htmlFor="custom-prompt"
                    className="block text-sm font-medium mb-2 text-gray-200"
                  >
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
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading || !originalImage}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl font-bold text-lg hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-500/50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  `Generate ${tabs.find((t) => t.id === activeTab)?.label}`
                )}
              </button>
              {originalImage && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="px-6 py-4 bg-gray-700/50 border border-gray-600 rounded-xl font-semibold hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Results Area */}
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
                  <p className="text-purple-300 font-semibold animate-pulse">
                    Creating your dream space...
                  </p>
                </div>
              </div>
            ) : redesignedImage ? (
              <div className="space-y-3">
                <img
                  src={redesignedImage}
                  alt="Redesigned room"
                  className="w-full rounded-xl border-2 border-purple-600 shadow-lg shadow-purple-900/50 hover:shadow-purple-700/70 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  onClick={() => window.open(redesignedImage, "_blank")}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-sm"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={() => window.open(redesignedImage, "_blank")}
                    className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg font-semibold hover:bg-gray-600/50 transition-all duration-300 text-sm"
                  >
                    🔗 Open Full Size
                  </button>
                </div>
              </div>
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

        {/* Footer */}
        <div className="text-center mt-12 pb-4">
          <p className="text-gray-400 text-lg font-bold">
            Powered by{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text font-bold">
              Cursor
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;

