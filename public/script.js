document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('shortenForm');
  const submitBtn = document.getElementById('submitBtn');
  const previewBtn = document.getElementById('previewBtn');
  
  const resultArea = document.getElementById('resultArea');
  const errorArea = document.getElementById('errorArea');
  const previewArea = document.getElementById('previewArea');
  
  const shortUrlAnchor = document.getElementById('shortUrlAnchor');
  const copyBtn = document.getElementById('copyBtn');
  const errorText = document.getElementById('errorText');
  const resultDetails = document.getElementById('resultDetails');
  
  const longUrlInput = document.getElementById('longUrl');
  const customCodeInput = document.getElementById('customCode');
  const passwordInput = document.getElementById('password');
  const expirySelect = document.getElementById('expirySelect');
  const customExpiryGroup = document.getElementById('customExpiryGroup');
  const customExpiryInput = document.getElementById('customExpiry');

  // Show/Hide custom expiry input
  expirySelect.addEventListener('change', () => {
    if (expirySelect.value === 'custom') {
      customExpiryGroup.classList.remove('hidden');
    } else {
      customExpiryGroup.classList.add('hidden');
    }
  });

  // Handle PREVIEW button
  previewBtn.addEventListener('click', async () => {
    const url = longUrlInput.value.trim();
    if (!url) {
      showError("Please enter a URL to preview.");
      return;
    }

    try {
      previewBtn.textContent = '...';
      previewBtn.disabled = true;
      hideError();
      previewArea.classList.add('hidden');

      const response = await fetch('/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned an invalid response (Status: ${response.status}). This usually means the backend crashed or timed out.`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch preview');

      document.getElementById('previewTitle').textContent = data.title;
      document.getElementById('previewDesc').textContent = data.description || 'No description found.';
      previewArea.classList.remove('hidden');

    } catch (err) {
      showError(err.message);
    } finally {
      previewBtn.textContent = 'Preview';
      previewBtn.disabled = false;
    }
  });

  // Handle FORM submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    resultArea.classList.add('hidden');
    
    submitBtn.textContent = 'Generating...';
    submitBtn.disabled = true;

    const url = longUrlInput.value.trim();
    const customCode = customCodeInput.value.trim() || undefined;
    const password = passwordInput.value.trim() || undefined;
    
    let expiresIn = undefined;
    if (expirySelect.value === 'custom') {
      expiresIn = customExpiryInput.value.trim();
    } else if (expirySelect.value !== '0') {
      expiresIn = expirySelect.value;
    }

    try {
      const response = await fetch('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, customCode, password, expiresIn })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned an invalid response (Status: ${response.status}). This usually means the database failed to connect or the backend timed out.`);
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to shorten URL');

      const fullShortUrl = `${window.location.protocol}//${window.location.host}/${data.shortCode}`;
      shortUrlAnchor.href = password ? `${fullShortUrl}?password=${password}` : fullShortUrl;
      shortUrlAnchor.textContent = fullShortUrl;
      
      // Build details section
      resultDetails.innerHTML = '';
      if (password) {
        resultDetails.innerHTML += `<div>🔒 <strong>Protected:</strong> Link requires password: <code>${password}</code></div>`;
      }
      if (data.expiresAt) {
        const d = new Date(data.expiresAt);
        resultDetails.innerHTML += `<div>⏳ <strong>Expires:</strong> ${d.toLocaleString()}</div>`;
      }

      resultArea.classList.remove('hidden');
      
      // Reset Optional Inputs
      customCodeInput.value = '';
      passwordInput.value = '';
      expirySelect.value = '0';
      customExpiryGroup.classList.add('hidden');
      customExpiryInput.value = '';
      previewArea.classList.add('hidden');
      longUrlInput.value = ''; // Clean up

    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.textContent = 'Shorten URL';
      submitBtn.disabled = false;
    }
  });

  // Handle COPY button
  copyBtn.addEventListener('click', async () => {
    try {
      // Copy just the URL, not the password attachment if we appended it to href for convenience
      await navigator.clipboard.writeText(shortUrlAnchor.textContent);
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
      console.error('Copy failed', err);
    }
  });

  function showError(msg) {
    errorText.textContent = msg;
    errorArea.classList.remove('hidden');
  }

  function hideError() {
    errorArea.classList.add('hidden');
    errorText.textContent = '';
  }
});
