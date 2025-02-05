import React, { useState, useEffect } from 'react';

function App() {
  const [note, setNote] = useState('');
  const [displayNote, setDisplayNote] = useState(''); // Corrected state name
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      setCurrentUrl(url);

      chrome.storage.local.get(url, (result) => {
        if (result[url]) {
          setNote(result[url]);
          setDisplayNote(result[url]); // Initialize displayNote with saved value
        }
      });
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ [currentUrl]: note }, () => {
      console.log('Note saved:', note);
      setDisplayNote(note); // Update displayNote after saving
    });
  };

  const handleDisplayNoteChange = (e) => {
    setDisplayNote(e.target.value); // Update displayNote when the textarea changes
  };

  return (
    <>
      <div>
        <h2>Quick Note for: {currentUrl}</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          cols={30}
        />
        <button onClick={handleSave}>Save Note</button>
      </div>
      <div>
        <textarea
          value={displayNote} // Now a controlled component
          onChange={handleDisplayNoteChange} // Update displayNote state
          rows={5}
          cols={30}
        />
      </div>
    </>
  );
}

export default App;