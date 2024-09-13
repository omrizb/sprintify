import configProd from './prod.js'
import configDev from './dev.js'
import env from 'dotenv'

env.config()


export var config

if (process.env.NODE_ENV === 'production') {
  config = configProd
} else {
  config = configDev
}
// config.isGuestMode = true

config = configProd


