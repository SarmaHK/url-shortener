document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('shortenForm');
  const submitBtn = document.getElementById('submitBtn');
  const resultArea = document.getElementById('resultArea');
  const errorArea = document.getElementById('errorArea');
  const shortUrlAnchor = document.getElementById('shortUrlAnchor');
  const copyBtn = document.getElementById('copyBtn');
  const errorText = document.getElementById('errorText');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset UI
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');
    submitBtn.textContent = 'Shortening...';
    submitBtn.disabled = true;

    const longUrl = document.getElementById('longUrl').value.trim();
    const customCode = document.getElementById('customCode').value.trim();

    try {
      const response = await fetch('/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: longUrl,
          customCode: customCode || undefined 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to shorten URL');
      }

      // Success
      const fullShortUrl = `${window.location.protocol}//${window.location.host}/${data.shortCode}`;
      shortUrlAnchor.href = fullShortUrl;
      shortUrlAnchor.textContent = fullShortUrl;
      
      resultArea.classList.remove('hidden');
      
      // Clear inputs
      document.getElementById('longUrl').value = '';
      document.getElementById('customCode').value = '';

    } catch (err) {
      // Error
      errorText.textContent = err.message;
      errorArea.classList.remove('hidden');
    } finally {
      submitBtn.textContent = 'Shorten URL';
      submitBtn.disabled = false;
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shortUrlAnchor.href);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.style.backgroundColor = '#dcfce7';
      copyBtn.style.color = '#166534';
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
        copyBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  });
});
