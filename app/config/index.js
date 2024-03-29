const Joi = require('joi')

const defaultPort = 3000

const schema = Joi.object({
  port: Joi.number().default(defaultPort),
  serviceName: Joi.string().default('AI Unit - Tech Radar')
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
