const mime = require('mime-types')

class DefaultHandler {
    static name = 'DefaultHandler'

    static inspect (file) {
      return Promise.reject({ code: 'ENOHANDLER', message: `Handler not found for: ${file}.` })
    }

    static saveThumbnail (file, dest) {
      return Promise.reject({ code: 'ENOHANDLER', message: `Handler not found for: ${file}.` })
    }
}

class Media {
    static typeMap = {}
    static nameMap = {}

    static addHandler (handler) {
      if (handler.name in this.nameMap) {
        console.warn(`${handler.name} is already registered.`)
        return
      }
      this.nameMap[handler.name] = handler
      for (const type of handler.handlesTypes) {
        if (!(type in this.typeMap)) {
          this.typeMap[type] = {
            current: handler.name,
            available: { [handler.name]: handler }
          }
        } else {
          if (handler.name in this.typeMap[type].available) {
            throw `${handler.name} is already registered for ${type}.`
          } else {
            this.typeMap[type].available[handler.name] = handler
          }
        }
      }
    }

    static getHandledTypes () {
      return Object.keys(this.typeMap)
    }

    static getHandlers (type) {
      const hSpec = this.typeMap[type]
      return hSpec ? Object.values(hSpec.available) : [DefaultHandler]
    }

    static getHandler (type) {
      const hSpec = this.typeMap[type]
      return hSpec ? hSpec.available[hSpec.current] : DefaultHandler
    }

    static setHandler (type, handler) {
      if (!handler.name in this.nameMap) {
        throw `${handler.name} is not registered.`
      }
      this.typeMap[type].current = handler.name
    }

    static inspect (file) {
      const handler = this.getHandler(mime.lookup(file))
      return handler.inspect(file)
    }

    static saveThumbnail (file, dest) {
      const handler = this.getHandler(mime.lookup(file))
      return handler.saveThumbnail(file, dest)
    }
}

module.exports = { Media, DefaultHandler }
