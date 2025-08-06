document.addEventListener('mouseover', (e) => {
  e.target.style.outline = '2px solid red'; // highlight element
});

document.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const selector = getUniqueSelector(e.target);
  console.log('Selector:', selector);

  chrome.runtime.sendMessage({ type: 'SELECTOR', selector });
});
