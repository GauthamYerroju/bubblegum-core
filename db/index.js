// NOTE: Batch statements in transaction: https://github.com/JoshuaWise/better-sqlite3/issues/125#issuecomment-395532558
const config = require('config')
const Database = require('better-sqlite3')
const query = require('./query.js')

// NOTE: Relying on IIFE for singleton behavior (multiple imports, one connection)
const public = (() => {
    // Connect to database
    const options = {
        verbose: config.get('db.verbose') ? console.log : undefined
    }
    const db = new Database(config.get('db.file'), options)
    if (config.get('db.wal')) {
        db.pragma('journal_mode = WAL')
    }
    
    // Init tables and prepare statements
    const st = {}
    for (let [k, v] of Object.entries(query)) {
        k.startsWith('create') ? db.exec(v) : st[k] = db.prepare(v)
    }

    // Public methods
    return {
        _db: db, // TODO: Remove after testing
        // Files
        addFile (info) {
            return st.addFile.run(info)
        },
        removeFile (id) {
            return st.removeFile.run({ xxhash: id })
        },
        getFile (id) {
            return st.getFile.get({ xxhash: id })
        },
        // Files batched
        addFiles (infoArr) {
            return db.transaction((data) => data.map(addFile))(infoArr)
        },
        removeFiles (ids) {
            return db.transaction((data) => data.map(removeFile))(ids)
        },
        getFiles (ids) {
            return db.transaction((data) => data.map(getFile))(ids)
        },
        // Thumbs
        addThumb (info) {
            return st.addThumb.run(info)
        },
        removeThumb (id) {
            return st.removeThumb.run({ xxhash: id })
        },
        getThumb (id) {
            return st.getThumb.get({ xxhash: id })
        },
        // Thumbs batched
        addThumbs (infoArr) {
            return db.transaction((data) => data.map(addThumb))(infoArr)
        },
        removeThumbs (ids) {
            return db.transaction((data) => data.map(removeThumb))(ids)
        },
        getThumbs (ids) {
            return db.transaction((data) => data.map(getThumb))(ids)
        }
    }
})();

module.exports = public
