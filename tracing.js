"use strict";

const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

// 1. Environment-Driven Configuration (Production Best Practice)
// We pull the endpoint and service name from the environment instead of hardcoding.
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "url-shortener-app";

// 2. Configure the Exporters to send data to SigNoz (or any OTLP collector)
const traceExporter = new OTLPTraceExporter({
  url: `${OTEL_ENDPOINT}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
  url: `${OTEL_ENDPOINT}/v1/metrics`,
});

// 3. Define Resource Attributes
// This identifies your service in the SigNoz Service Map and Dashboard
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

// 4. Initialize the OpenTelemetry NodeSDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: new (require('@opentelemetry/sdk-metrics').PeriodicExportingMetricReader)({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // Export metrics every 10 seconds
  }),
  // Auto-Instrumentation magically hooks into Express, HTTP, and MongoDB!
  instrumentations: [getNodeAutoInstrumentations({
    // We can disable specific auto-instrumentations here if they are too noisy
    '@opentelemetry/instrumentation-fs': { enabled: false },
  })],
});

// 5. Start the SDK and gracefully handle shutdown
sdk.start();

console.log(`[OpenTelemetry] 🚀 Instrumentation started for service: ${SERVICE_NAME}`);

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("[OpenTelemetry] Shutting down gracefully"))
    .catch((error) => console.log("[OpenTelemetry] Error shutting down", error))
    .finally(() => process.exit(0));
});
