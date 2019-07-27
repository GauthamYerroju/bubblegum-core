const mime = require('mime-types')

const imageHandler = require('./image.js')
const fallbackHandler = require('./fallback.js')

// TODO: Make a proper interface instead of using the pointless fallback file

let handlers = [imageHandler]

function getHandler(type) {
    for (const handler of handlers) {
        if (handler.handlesTypes.includes(type)) {
            return handler
        }
    }
    return fallbackHandler
}

function inspect(file) {
    const handler = getHandler(mime.lookup(file))
    return handler.inspect(file)
}

function saveThumbnail(file, dest) {
    const handler = getHandler(mime.lookup(file))
    return handler.saveThumbnail(file, dest)
}

module.exports = {
    inspect,
    saveThumbnail
}
