const fileTable = 'file_info'
const thumbTable = 'thumbnail_info'
const tagTypeTable = 'tag_type'
const tagDefTable = 'tag_definition'
const tagFileMapTable = 'tag_file_map'
const queries = {
    // File Info
    createFileTable: `CREATE TABLE IF NOT EXISTS ${fileTable} (id INTEGER PRIMARY KEY, name TEXT, xxhash TEXT, mtime REAL, ext TEXT, width INTEGER, height INTEGER);`,
    getFile: `SELECT * FROM ${fileTable} WHERE xxhash=@xxhash;`,
    addFile: `INSERT INTO ${fileTable} (name, xxhash, mtime, ext, width, height) VALUES (@name, @xxhash, @mtime, @ext, @width, @height);`,
    removeFile: `DELETE FROM ${fileTable} WHERE xxhash=@xxhash;`,
    // Thumbnail Info
    createThumbTable: `CREATE TABLE IF NOT EXISTS ${thumbTable} (id INTEGER PRIMARY KEY, xxhash TEXT, sequence INTEGER);`,
    getThumb: `SELECT * FROM ${thumbTable} where xxhash=@xxhash;`,
    addThumb: `INSERT INTO ${thumbTable} (xxhash, sequence) VALUES (@xxhash, @sequence);`,
    removeThumb: `DELETE FROM ${thumbTable} WHERE xxhash=@xxhash;`,
    // Tag Types
    createTagTypeTable: `CREATE TABLE IF NOT EXISTS ${tagTypeTable} (id INTEGER PRIMARY KEY, name TEXT);`,
    // Tag Definitions
    createTagDefTable: `CREATE TABLE IF NOT EXISTS ${tagDefTable} (id INTEGER PRIMARY KEY, name TEXT, type_id INTEGER REFERENCES ${tagTypeTable}(id) ON DELETE SET NULL);`,
    // Tag-File Mappings
    createTagFileMapTable: `CREATE TABLE IF NOT EXISTS ${tagFileMapTable} (id INTEGER PRIMARY KEY, file_id INTEGER REFERENCES ${fileTable}(id) ON DELETE CASCADE, tag_id INTEGER REFERENCES ${tagDefTable}(id) ON DELETE CASCADE);`,
    // TODO: dynamic queries (pagination, sort, filter, etc)
}

module.exports = queries
