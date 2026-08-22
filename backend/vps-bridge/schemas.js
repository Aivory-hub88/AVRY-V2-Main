/**
 * JSON Schema Definitions
 * Schemas for validating API responses
 */

const Ajv = require('ajv');
const ajv = new Ajv();

// ============================================================================
// DIAGNOSTIC RESULT SCHEMA
// ============================================================================

const diagnosticResultSchema = {
  type: 'object',
  required: ['diagnostic_id', 'organization_id', 'score', 'maturity_level'],
  properties: {
    diagnostic_id: { type: 'string' },
    organization_id: { type: 'string' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    maturity_level: { 
      type: 'string', 
      enum: ['Emerging', 'Developing', 'Advancing', 'Leading'] 
    },
    strengths: { type: 'string' },
    blocker: { type: 'string' },
    opportunity: { type: 'string' },
    narrative: { type: 'string' },
    timestamp: { type: 'string' }
  },
  additionalProperties: true
};

// ============================================================================
// BLUEPRINT SCHEMA
// ============================================================================

const blueprintSchema = {
  type: 'object',
  required: ['blueprint_id', 'organization_id', 'diagnostic_id', 'version'],
  properties: {
    blueprint_id: { type: 'string' },
    organization_id: { type: 'string' },
    diagnostic_id: { type: 'string' },
    version: { type: 'number' },
    objective: { type: 'string' },
    strategy: { type: 'object' },
    implementation_plan: { type: 'array' },
    success_metrics: { type: 'array' },
    timestamp: { type: 'string' }
  },
  additionalProperties: true
};

// ============================================================================
// COMPILED VALIDATORS
// ============================================================================

const validateDiagnosticResult = ajv.compile(diagnosticResultSchema);
const validateBlueprint = ajv.compile(blueprintSchema);

module.exports = {
  diagnosticResultSchema,
  blueprintSchema,
  validateDiagnosticResult,
  validateBlueprint
};
