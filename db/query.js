const fileTable = 'file_info'
const thumbTable = 'thumbnail_info'
const tagTypeTable = 'tag_type'
const tagDefTable = 'tag_definition'
const tagFileMapTable = 'tag_file_map'
const queries = {
    // File Info
    createFileTable: `CREATE TABLE IF NOT EXISTS ${fileTable} (id INTEGER PRIMARY KEY, name TEXT, path TEXT UNIQUE, xxhash TEXT, mtime REAL, type TEXT, size INTEGER, width INTEGER, height INTEGER);`,
    addFile: `INSERT OR IGNORE INTO ${fileTable} (name, path, xxhash, mtime, type, size, width, height) VALUES (@name, @path, @xxhash, @mtime, @type, @size, @width, @height);`,
    getFileByPath: `SELECT * FROM ${fileTable} WHERE path=@path;`,
    getFileByHash: `SELECT * FROM ${fileTable} WHERE xxhash=@xxhash;`,
    getFileByHashAndPath: `SELECT * FROM ${fileTable} WHERE xxhash=@xxhash AND path=@path;`,
    removeFileById: `DELETE FROM ${fileTable} WHERE id=@id;`,
    // Thumbnail Info
    createThumbTable: `CREATE TABLE IF NOT EXISTS ${thumbTable} (id INTEGER PRIMARY KEY, xxhash TEXT, sequence INTEGER, path TEXT);`,
    getThumb: `SELECT * FROM ${thumbTable} WHERE xxhash=@xxhash;`,
    addThumb: `INSERT INTO ${thumbTable} (xxhash, sequence, path) VALUES (@xxhash, @sequence, @path);`,
    removeThumb: `DELETE FROM ${thumbTable} WHERE xxhash=@xxhash;`,
    // Tag Types
    createTagTypeTable: `CREATE TABLE IF NOT EXISTS ${tagTypeTable} (id INTEGER PRIMARY KEY, name TEXT);`,
    // Tag Definitions
    createTagDefTable: `CREATE TABLE IF NOT EXISTS ${tagDefTable} (id INTEGER PRIMARY KEY, name TEXT, type_id INTEGER REFERENCES ${tagTypeTable}(id) ON DELETE SET NULL);`,
    // Tag-File Mappings
    createTagFileMapTable: `CREATE TABLE IF NOT EXISTS ${tagFileMapTable} (id INTEGER PRIMARY KEY, file_id INTEGER REFERENCES ${fileTable}(id) ON DELETE CASCADE, tag_id INTEGER REFERENCES ${tagDefTable}(id) ON DELETE CASCADE);`
}

module.exports = queries
