# 🔗 URL Shortener (with OpenTelemetry & SigNoz)

A high-performance, full-stack URL shortener built with **Node.js, Express, and MongoDB**, featuring a beautiful glassmorphism UI, advanced security, link expiration, and password protection.

This project is fully containerized using **Docker** and instrumented with **OpenTelemetry**, providing production-grade observability via **SigNoz** for distributed tracing, metrics, and latency monitoring.

---

## ✨ Key Features

- **🎨 Beautiful UI**: A fully responsive, modern frontend designed with glassmorphism and smooth animations.
- **🛡️ Secure Processing**: Built-in Rate Limiting and URL validation to prevent spam and abuse.
- **🔐 Password Protection**: Secure your shortened URLs so only authorized users with the password can access the destination.
- **⏳ Link Expiration**: Set links to automatically expire after 1 hour, 1 day, 7 days, or a custom timeframe.
- **✨ Smart Aliases**: Users can define their own `customCode` or the system generates one automatically.
- **📊 OpenTelemetry Observability**: Fully instrumented backend (MongoDB and Express tracing). A local OpenTelemetry Collector sidecar batches and securely transmits telemetry to a SigNoz APM dashboard.
- **🐳 Dockerized**: Deploys seamlessly using Docker Compose with an NGINX reverse proxy.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Observability**: OpenTelemetry (`@opentelemetry/auto-instrumentations-node`), SigNoz
- **Infrastructure**: Docker, Docker Compose, NGINX
- **Security**: `bcrypt` (password hashing), `helmet` (HTTP headers), `express-rate-limit` (DDoS protection)

---

## 🚀 Deployment via Docker (AWS / Local)

This repository uses **Docker Compose** to spin up the Node.js application, an NGINX reverse proxy, and the OpenTelemetry Collector sidecar agent.

### Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/compose/install/)
- A [MongoDB database](https://www.mongodb.com/atlas/database) (Local or Cloud/Atlas)
- A running **SigNoz** backend instance.

### 1. Environment Variables
Create a `.env` file in the root directory:
```env
# Application Settings
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/urlShortener

# OpenTelemetry Settings
OTEL_SERVICE_NAME=url-shortener-app
# Replace with the IP address of your SigNoz Server
OTEL_EXPORTER_OTLP_ENDPOINT=http://<SIGNOZ_EC2_IP>:4317
```

### 2. Configure the OTel Collector
Update the `docker-compose.yml` file. Locate the `url-shortener-otel-collector` service and ensure `SIGNOZ_ENDPOINT` points to your SigNoz EC2 IP Address.

### 3. Run the Stack
Run the following command to build the Docker image and start all containers in detached mode:
```bash
docker compose up --build -d
```
Visit `http://localhost` (or your EC2 public IP) in your browser.

---

## 📡 API Reference

All requests and responses use `application/json` format.

| Method   | Endpoint                  | Description                                      | Requires Auth  |
| -------- | ------------------------- | ------------------------------------------------ | -------------- |
| `POST`   | `/preview`                | Fetches the Title & Description of a target URL. | No             |
| `POST`   | `/shorten`                | Generates a new short URL.                       | No             |
| `GET`    | `/:code`                  | Redirects the user to the underlying long URL.   | *(If expected)*|
| `GET`    | `/shorten/:code/stats`    | Retrieves analytics and statistics for a link.   | No             |
| `PUT`    | `/shorten/:code`          | Updates the destination of an existing short URL.| No             |
| `DELETE` | `/shorten/:code`          | Deletes a shortened URL entirely.                | No             |

---

## 📝 License

This project is licensed under the MIT License.

---
*Built with lessons learned - Sarma HK ✍️*
