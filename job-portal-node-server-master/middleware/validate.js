const { ZodError } = require('zod');

function buildError(err) {
  const validationError = new Error('Validation failed');
  validationError.status = 400;
  validationError.code = 'validation_error';
  validationError.details = err.issues || err.details || [];
  return validationError;
}

function validate(schema, value) {
  try {
    const parsed = schema.parse(value);
    return { parsed, error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      return { parsed: null, error: buildError(err) };
    }
    return { parsed: null, error: err };
  }
}

function validateBody(schema) {
  return (req, res, next) => {
    const { parsed, error } = validate(schema, req.body);
    if (error) {
      return next(error);
    }
    req.body = parsed;
    return next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { parsed, error } = validate(schema, req.query);
    if (error) {
      return next(error);
    }
    req.query = parsed;
    return next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const { parsed, error } = validate(schema, req.params);
    if (error) {
      return next(error);
    }
    req.params = parsed;
    return next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
};


