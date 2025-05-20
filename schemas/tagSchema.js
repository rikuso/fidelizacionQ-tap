// schemas/tagSchema.js
const Joi = require('joi');

module.exports = {
  createTag: Joi.object({
    uid: Joi.string().hex().length(24).required(),
    url: Joi.string().uri({ scheme: ['https'] }),
    deviceId: Joi.string().pattern(/^[a-f0-9]{16}$/), // Ej: UUID simplificado
    scanType: Joi.string().valid('nfc', 'qr', 'barcode') // Extensible
  })
};

// En routes/tagRoutes.js
const { createTag } = require('../schemas/tagSchema');
router.post(
  '/',
  apiKeyAuth,
  rateLimiter,
  (req, res, next) => {
    const { error } = createTag.validate(req.body);
    if (error) return res.status(400).json(error.details);
    next();
  },
  asyncHandler(tagController.saveUID)
);