/**
 * Configuration for Adult and Spam content filtering.
 * Add keywords or domains to these lists to block them.
 */
module.exports = {
  // Common adult/spam keywords to check in URL and Page Preview
  blockedKeywords: [
    "porn", "sex", "adult", "naked", "xxx", "nude", "casino", "gambling",
    "betting", "lottery", "crypto", "bitcoin", "pill", "viagra", "dating",
    "hookup", "escort", "webcam", "erotic", "nsfw"
  ],

  // Specific high-risk domains commonly used for spam/adult content
  blockedDomains: [
    "bit.ly", "t.co", "tinyurl.com", // Prevent shortening a shortener (common spam trick)
    "example-porn-site.com", // Placeholder for specific blocks
  ],

  // Block entire TLDs known for high spam/low trust
  blockedTLDs: [
    ".tk", ".ml", ".ga", ".cf", ".gq", // Freenom TLDs (frequently used for phishing/spam)
    ".zip", ".mov", // Potential security risk TLDs
    ".xyz", ".live", ".icu", ".top" // Frequently abused
  ]
};
