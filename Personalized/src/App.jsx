import React, { useState, useEffect } from "react";

function App() {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await fetch(
        "https://api.thenewsapi.com/v1/news/sources?api_token=EPUiZxBv58h38uQb8ItQPVUKd9w1EmyBBupnoZRP"
        // its free api so use it if you want or you can get it on on the site!!
      );
      const data = await response.json();
      const uniqueCategories = [
        ...new Set(data.data.flatMap((source) => source.categories)),
      ];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Fetch news based on selected category
  const fetchNews = () => {
    chrome.runtime.sendMessage(
      { type: "fetchNews", category: selectedCategory },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Chrome Runtime Error:", chrome.runtime.lastError.message);
          return;
        }

        if (!response || !response.success) {
          console.error("Failed to fetch news:", response?.error);
          return;
        }

        setNews(response.data.data);
      }
    );
  };

  useEffect(() => {
    fetchCategories();
    fetchNews();
  }, [selectedCategory]);

  return (
    <div className="w-[300px] p-4 bg-[#3A4750] rounded-lg shadow-lg text-[#EEEEEE]">
      <h2 className="text-sm font-bold text-center mb-3">📢 Latest News</h2>

      {/* Dropdown for selecting category */}
      <select
        className="w-full p-1 mb-3 border rounded-md text-xs bg-[#EEEEEE] text-[#3A4750] focus:outline-none"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category.toUpperCase()}
          </option>
        ))}
      </select>

      <button
        className="w-full py-2 mb-4 bg-[#5F6F73] text-white text-xs rounded-md hover:bg-[#4B5A5C] transition"
        onClick={fetchNews}
      >
        🔄 Refresh News
      </button>

      {/* News List */}
      <div className="space-y-3">
        {news.length === 0 ? (
          <p className="text-center text-[#CCCCCC] text-xs">No news available.</p>
        ) : (
          news.map((item) => (
            <div key={item.uuid} className="flex items-start bg-[#4B5A5C] p-3 rounded-lg shadow-sm">
              {/* Image on the left */}
              <img
                src={item.image_url}
                alt={item.title}
                className="w-20 h-16 object-cover rounded-md mr-3"
              />
              
              {/* Text on the right */}
              <div className="flex flex-col justify-between">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#EEFFEE] hover:underline mb-1"
                >
                  {item.title}
                </a>
                <p className="text-xs text-[#CCCCCC]">
                  {item.source} • {new Date(item.published_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
