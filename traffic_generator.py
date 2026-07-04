import time
import random
import urllib.request
import json
import socket

# Your EC2 Public IP
TARGET_URL = "http://13.250.29.161"

SAMPLE_URLS = [
    "https://google.com",
    "https://github.com",
    "https://stackoverflow.com",
    "https://youtube.com",
    "https://aws.amazon.com",
    "https://nodejs.org"
]

print(f"Starting realistic traffic generator targeting {TARGET_URL}")
print("This will simulate real human users clicking around your site.")
print("Press Ctrl+C to stop when you have enough data for your graphs.\n")

# Set a global timeout so it doesn't hang
socket.setdefaulttimeout(5)

requests_made = 0

try:
    while True:
        # Weighted random choice to simulate realistic user behavior
        # Most users just visit the homepage, some preview, some shorten
        action = random.choice([
            "visit_home", "visit_home", "visit_home", 
            "visit_home", "visit_home",
            "preview", "preview", 
            "shorten"
        ])
        
        try:
            if action == "visit_home":
                print(f"[{requests_made}] User is visiting the homepage...")
                urllib.request.urlopen(TARGET_URL)
                
            elif action == "preview":
                url_to_preview = random.choice(SAMPLE_URLS)
                print(f"[{requests_made}] User is previewing: {url_to_preview}")
                data = json.dumps({"url": url_to_preview}).encode('utf-8')
                req = urllib.request.Request(
                    f"{TARGET_URL}/preview", 
                    data=data, 
                    headers={'Content-Type': 'application/json'}
                )
                urllib.request.urlopen(req)
                
            elif action == "shorten":
                url_to_shorten = random.choice(SAMPLE_URLS)
                print(f"[{requests_made}] User is shortening: {url_to_shorten}")
                data = json.dumps({"url": url_to_shorten}).encode('utf-8')
                req = urllib.request.Request(
                    f"{TARGET_URL}/shorten", 
                    data=data, 
                    headers={'Content-Type': 'application/json'}
                )
                urllib.request.urlopen(req)
                
        except Exception as e:
            print(f"Request error (simulating dropped connection): {e}")

        requests_made += 1

        # Sleep for a random amount of time between 2 and 12 seconds
        # This prevents the CPU from spiking to 100% and makes the graph 
        # look like actual human traffic spread throughout the day.
        sleep_time = random.uniform(2.0, 12.0)
        time.sleep(sleep_time)

except KeyboardInterrupt:
    print("\n\nTraffic generator stopped successfully.")
    print(f"Total requests simulated: {requests_made}")
