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
        // Search statements are created on demand and cached.
        // Why? "ORDER BY col_name" doesn't work in db.prepare() because it becomes "ORDER BY 'col_name'".
        st._cache = {}
        st.search = (orderby, desc, limit, offset) => {
            // Limit and offset values don't matter, just whether they exist or not
            const key = [orderby, desc, (limit !== undefined), (offset !== undefined)]
            if (!(st._cache[key])) {
                let stmt = 'SELECT * FROM file_info WHERE name LIKE @name'
                if (orderby) stmt = `${stmt} ORDER BY ${orderby}`;
                if (desc) stmt = `${stmt} DESC`;
                stmt = `${stmt}, name`
                if (limit) stmt = `${stmt} LIMIT @limit`
                if (offset) stmt = `${stmt} offset @offset`
                stmt = `${stmt};`
                st._cache[key] = db.prepare(stmt)
                console.warn('!!! Statement prepared for:', key)
            }
            return st._cache[key]
        }
    }

    // Public methods
    return {
        _db: db, // TODO: Remove after testing
        // Files
        addFile (info) {
            return st.addFile.run(info)
        },
        removeFileById (id) {
            return st.removeFileById.run({ id })
        },
        getFileByPath (path) {
            return st.getFileByPath.get({ path })
        },
        getFileByHash (xxhash) {
            return st.getFileByHash.get({ xxhash })
        },
        getFileByHashAndPath (xxhash, path) {
            return st.getFileByHashAndPath.get({ xxhash, path })
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
        // Search
        searchPage(name, orderby='name', desc=false, limit, offset) {
            values = {name: `%${name}%`, orderby, desc, limit, offset}
            return st.search(orderby, desc, limit, offset).all(values)
        },
        searchIter(name, orderby='name', desc=false) {
            values = {name: `%${name}%`, orderby, desc}
            return st.search(orderby, desc).iterate(values)
        }
    }
})();

module.exports = public
