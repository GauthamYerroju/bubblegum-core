const config = require('config')
const mime = require('mime-types')
const Ffmpeg = require('fluent-ffmpeg')
const { promisify } = require('util')
const { DefaultHandler } = require('./index.js')

class VideoHandler extends DefaultHandler {
    static name = 'VideoHandler'
    static handlesTypes = 'AVI, MP4, WEBM, MKV, FLV'.split(', ').map(ext => mime.lookup('_.' + ext))

    static inspect (file) {
      return new Promise((resolve, reject) => {
        promisify(Ffmpeg.ffprobe)(file)
          .then(data => {
            const stream = data.streams.find(stream => stream.width)
            if (stream) {
              resolve({ width: stream.width, height: stream.height })
              return
            }
            reject({ error: { message: 'Cannot find metadata', data: data } })
          })
          .catch(reject)
      })
    }

    static saveThumbnail (file, dest) {
      // Handle simple thumbnails, GIF and PNG with transparency and animated GIFs
      // Ref: https://engineering.giphy.com/how-to-make-gifs-with-ffmpeg/
      const size = config.get('thumbnail.size')
      return new Promise((resolve, reject) => {
        Ffmpeg(file)
          .on('stderr', line => {
            console.warn(`saveThumbnail error for ${file}: ${line}`)
          })
          .on('error', (err, stdout, stderr) => {
            console.error(`Cannot create thumbnail for ${file}: ${err.message}`)
            reject(err)
          })
        // .complexFilter([
        //     `scale=${size}:${size}:force_original_aspect_ratio=decrease`
        //     // `[0:v] fps=15,scale=${size}:${size}:force_original_aspect_ratio=decrease,split [a][b];[a] palettegen [p];[b][p] paletteuse`
        //     // `[0:v] fps=15,scale=${size}:${size}:force_original_aspect_ratio=decrease,split [a][b];[a] palettegen=stats_mode=single [p];[b][p] paletteuse=new=1`
        // ])
          .takeFrames(1)
          .size(`${size}x?`)
          .output(dest)
          .on('end', (stdout, stderr) => {
            if (stdout) console.log(`stdout: ${stdout}`)
            if (stderr) console.error(`stderr: ${stderr}`)
            resolve(dest)
          })
          .run()
      })
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
