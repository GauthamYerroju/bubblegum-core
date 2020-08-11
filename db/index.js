// NOTE: Batch statements in transaction: https://github.com/JoshuaWise/better-sqlite3/issues/125#issuecomment-395532558
const config = require('config')
const Database = require('better-sqlite3')
const query = require('./query.js')

// NOTE: Relying on IIFE for singleton behavior (multiple imports, one connection)
const instance = (() => {
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
  for (const [k, v] of Object.entries(query)) {
    k.startsWith('create') ? db.exec(v) : st[k] = db.prepare(v)
    // Search statements are created on demand and cached.
    // Why? "ORDER BY col_name" doesn't work in db.prepare() because it becomes "ORDER BY 'col_name'".
    st._cache = {}
    st.search = (orderby, desc, limit, offset) => {
      // Limit and offset values don't matter, just whether they exist or not
      const key = [orderby, desc, (limit !== undefined), (offset !== undefined)]
      if (!(st._cache[key])) {
        let stmt = 'SELECT * FROM file_info WHERE name LIKE @name'
        if (orderby) stmt = `${stmt} ORDER BY ${orderby}`
        if (desc) stmt = `${stmt} DESC`
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
    _db: db,
    // Files
    addFile (info) {
      st.addFile.run(info)
    },
    removeFileById (id) {
      return st.removeFileById.run({ id })
    },
    getFileByPath (path) {
      return st.getFileByPath.get({ path })
    },
    // Thumbs
    addThumb (info) {
      return st.addThumb.run(info)
    },
    removeThumb (xxhash) {
      return st.removeThumb.run({ xxhash })
    },
    getThumb (xxhash) {
      return st.getThumb.get({ xxhash })
    },
    // Search
    searchPage (name, orderby = 'name', desc = false, limit, offset) {
      const values = { name: `%${name}%`, orderby, desc, limit, offset }
      return st.search(orderby, desc, limit, offset).all(values)
    },
    searchIter (name, orderby = 'name', desc = false) {
      const values = { name: `%${name}%`, orderby, desc }
      return st.search(orderby, desc).iterate(values)
    }
  }
})()

module.exports = instance
