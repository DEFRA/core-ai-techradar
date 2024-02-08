const Joi = require('joi')

const schema = Joi.object({
  port: Joi.number().default(3000)
})

const config = {
  port: process.env.PORT
}

const { error, value } = schema.validate(config, {
  abortEarly: false
})

if (error) {
  throw new Error(`Server configuration invalid: ${error}`)
}

module.exports = value