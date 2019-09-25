const config = require('config')
const mime = require('mime-types')
const Ffmpeg = require('fluent-ffmpeg')
const { promisify } = require('util')
const { DefaultHandler } = require('./index.js')


class VideoHandler extends DefaultHandler {

    static name = 'VideoHandler'
    static handlesTypes = 'AVI, MP4, WEBM, MKV, FLV'.split(', ').map(ext => mime.lookup('_.' + ext))

    static inspect(file) {
        return new Promise((resolve, reject) => {
            promisify(Ffmpeg.ffprobe)(file)
            .then(data => {
                if (data.streams) {
                    for (const stream of data.streams) {
                        if (stream && stream.width) {
                            resolve({width: stream.width, height: stream.height})
                            return
                        }
                    }
                }
                reject({error: {message: 'Cannot find metadata', data: data}})
            })
            .catch(reject)
        })
    }
    
    static saveThumbnail(file, dest) {
        // Handle simple thumbnails, GIF and PNG with transparency and animated GIFs
        return Promise.resolve(file)
    }

    static handlesTypesDynamic = Promise.all([
        promisify(Ffmpeg.getAvailableCodecs)(),
        promisify(Ffmpeg.getAvailableFormats)()
    ]).then(([codecs, formats]) => {
        const mimes = new Set()
        for (const [key, obj] of Object.entries(codecs)) {
            if (obj.canDecode) {
                mimes.add(mime.extension(mime.lookup(key)))
            }
        }
        for (const [key, obj] of Object.entries(formats)) {
            if (obj.canDemux) {
                mimes.add(mime.lookup(key))
            }
        }
        return Promise.resolve(Array.from(mimes).filter(x => x))
    })
}

module.exports = { VideoHandler }