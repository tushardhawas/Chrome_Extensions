chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "fetchNews") {
    const categoryParam = request.category ? `&categories=${request.category}` : "";
    const apiUrl = `https://api.thenewsapi.com/v1/news/top?api_token=EPUiZxBv58h38uQb8ItQPVUKd9w1EmyBBupnoZRP&locale=in&limit=5${categoryParam}`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keeps the message port open for async response
  }
});
