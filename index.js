const { iterDir } = require('./tools.js')
const { Media } = require('./media')
const { ImageHandler } = require('./media/image')
const { VideoHandler } = require('./media/video')

Media.addHandler(ImageHandler)
Media.addHandler(VideoHandler)

module.exports = {
    iterDir,
    Media
}

// TODO: normalize backslashes to forward slashes in tools#iterDir
// TODO: Why do I need path in file_info table again? Reminder: layered diffing (id by path, check mtime, if changed, check xxhash, then redo thumbnail)

const sandbox = true
if (sandbox) {
    const process = require('process')
    const config = require('config')
    const dir = process.argv[2] || config.get('fs.defaultDir')
    const recurse = process.argv[3] || config.get('fs.recurse')
    const sortBy = process.argv[4] || 'name'
    console.log(dir, recurse, sortBy)

    const db = require('./db')
    for (const item of iterDir(dir, recurse, sortBy)) {
        Media.inspect(item.path).then(meta => {
            console.log(meta)
            db.addFile({
                name: item.name,
                xxhash: null,
                mtime: item.mtime,
                ext: item.ext,
                width: 0,
                height: 0,
            })
        }).catch(err => console.error(err))
    }
    // console.table(db._db.prepare("SELECT * FROM file_info;").all())
}
