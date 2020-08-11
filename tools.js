const fs = require('fs')
const path = require('path')
const mime = require('mime-types')
const config = require('config')
const xxhash = require('xxhash')
const { promisify } = require('util')
const db = require('./db')
const { Media } = require('./media')

function getHash (filename) {
  var hasher = new xxhash.XXHash64(0xCAFEBABE)
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .on('data', (data) => {
        hasher.update(data)
      })
      .on('end', () => resolve(hasher.digest('hex')))
      .on('error', reject)
  })
  // return xxhash.hash64(data, 0xCAFEBABE, 'hex')
}

function * iterDir (dirName, recurse = false, sortBy = null, sortReverse = false) {
  const files = fs.readdirSync(dirName).map(item => makeFileProps(dirName, item))
  files.sort((a, b) => getSortFunction(a, b, sortBy, sortReverse))

  const dirs = []
  for (const item of files) {
    yield item
    if (recurse && item.dir) dirs.push(item)
  }
  if (recurse && (typeof recurse === 'number')) --recurse
  for (const dir of dirs) {
    yield * iterDir(dir.path, recurse, sortBy, sortReverse)
  }
}

// This should only have stuff from fs.stat, post-process the results if needed.
function makeFileProps (dirName, item) {
  const fullPath = path.resolve(dirName, item)
  const res = {
    name: item,
    path: fullPath
  }
  try {
    const stat = fs.statSync(fullPath)
    res.dir = stat.isDirectory()
    if (!res.dir) {
      res.ext = path.extname(item)
    }
    for (const [sortKey, statKey] of Object.entries(config.get('statKeys'))) {
      res[sortKey] = stat[statKey]
    }
  } catch (err) {
    res.error = err
  }
  return res
}

function getSortFunction (a, b, sortBy, sortReverse) {
  sortBy = (Object.keys(config.get('statKeys'))).includes(sortBy) ? sortBy : 'name'
  const plusOne = sortReverse ? -1 : 1
  if (a[sortBy] > b[sortBy]) return plusOne
  if (a[sortBy] < b[sortBy]) return -plusOne
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

// Driver method for reading file (and pass through DB, creating entries and thumbnails as needed)
function getFileData (item, resolveAfterInsert = false) {
  if (item.dir || item.error) {
    return Promise.resolve(item)
  }
  const row = db.getFileByPath(item.path)
  if (!row) {
    return importFile(item, resolveAfterInsert).catch(error => Object.assign(item, { error }))
  }
  item = Object.assign(item, row)
  if (item.mtime === row.mtime) {
    const thumb = db.getThumb(item.xxhash)
    if (thumb) {
      return new Promise((resolve, reject) => {
        promisify(fs.stat)(thumb.path)
          .then(() => {
            resolve(Object.assign(item, { thumb: thumb.path }))
          })
          .catch(err => {
            if (err.code !== 'ENOENT') {
              reject(err)
              return
            }
            // Thumbnail file doesn't exist, re-create it
            db.removeThumb(item.xxhash)
            createThumb(item)
              .then(thumbPath => {
                resolve(Object.assign(item, { thumb: thumbPath }))
              })
              .catch(reject)
          })
      })
    }
    return new Promise((resolve, reject) => {
      createThumb(item)
        .then(thumbPath => {
          resolve(Object.assign(item, { thumb: thumbPath }))
        })
        .catch(reject)
    })
  }
  return importFile(item, resolveAfterInsert).catch(error => Object.assign(item, { error }))
}
function getFileDataBatch (items, resolveAfterInsert) {
  const dbFetchCount = items.filter(i => !(i.dir || i.error)).length
  if (!dbFetchCount) {
    return Promise.resolve(items)
  }
  const rows = db._db.transaction(() => items.map(item => (item.dir || item.error) ? item : db.getFileByPath(item.path)))()
  const promises = rows.map(function (row, i) {
    let item = items[i]
    if (item.dir || item.error) {
      return Promise.resolve(item)
    }
    if (!row) {
      return importFile(item, resolveAfterInsert).catch(error => Object.assign(item, { error }))
    }
    item = Object.assign(item, row)
    if (item.mtime === row.mtime) {
      const thumb = db.getThumb(item.xxhash)
      if (thumb) {
        return new Promise((resolve, reject) => {
          promisify(fs.stat)(thumb.path)
            .then(() => {
              resolve(Object.assign(item, { thumb: thumb.path }))
            })
            .catch(err => {
              if (err.code !== 'ENOENT') {
                reject(err)
                return
              }
              // Thumbnail file doesn't exist, re-create it
              db.removeThumb(item.xxhash)
              createThumb(item)
                .then(thumbPath => {
                  resolve(Object.assign(item, { thumb: thumbPath }))
                })
                .catch(reject)
            })
        })
      }
      return new Promise((resolve, reject) => {
        createThumb(item)
          .then(thumbPath => {
            resolve(Object.assign(item, { thumb: thumbPath }))
          })
          .catch(reject)
      })
    }
    return importFile(item, resolveAfterInsert).catch(error => Object.assign(item, { error }))
  })
  return Promise.all(promises)
}
function importFile (item, resolveAfterInsert) {
  return new Promise((resolve, reject) => {
    Media.inspect(item.path)
      .then(meta => {
        getHash(item.path)
          .catch(reject)
          .then(hash => {
            // Add DB entry
            const dbData = {
              name: item.name,
              path: item.path,
              xxhash: hash,
              mtime: item.mtime,
              type: item.ext,
              size: item.size,
              width: meta.width,
              height: meta.height
            }
            item = Object.assign(item, dbData)
            db.addFile(item)

            // Make thumbnail and add to DB if needed
            createThumb(item)
              .then(savedThumb => {
                resolve(Object.assign(item, { thumb: savedThumb }))
              })
              .catch(reject)
          })
      })
      .catch(err => {
        if (err.code === 'ENOHANDLER') {
          resolve(item)
          return
        }
        console.error(err)
        resolve(item)
      })
  })
}
function createThumb (item) {
  const thumb = db.getThumb(item.xxhash)
  if (thumb) {
    item = Object.assign(item, { thumb: thumb.path })
    return Promise.resolve(item)
  }
  const mtype = mime.lookup(item.path)
  const isGif = mtype.startsWith('video') || mtype === 'image/gif'
  const thumbName = item.xxhash + (isGif ? '.gif' : '.png')
  const thumbDest = getThumbPath(thumbName)
  return new Promise((resolve, reject) => {
    ensureDirSync(path.dirname(thumbDest))
    Media.saveThumbnail(item.path, thumbDest)
      .then(savedPath => {
        db.addThumb({ xxhash: item.xxhash, sequence: 0, path: thumbDest })
        resolve(savedPath)
      })
      .catch(err => {
        console.error(err)
        reject(err)
      })
  })
}

// Driver method for reading DB rows (and pass through filesystem, cleaning up entries as needed)
function searchDb (name, orderby = 'name', desc = false, limit, offset) {
  const rows = db.searchPage(name, orderby, desc, limit, offset)
  const promises = []
  for (const row of rows) {
    promises.push(new Promise((resolve, reject) => {
      fs.stat(row.path, (err, info) => {
        if (err) {
          if (err.code === 'ENOENT') {
            resolve(null)
            // cleanMissingFile(row) // TODO: just mark for delete, don't clean now
          } else {
            reject(err)
          }
        } else {
          if (info.mtimeMs !== row.mtime) {
            cleanMissingFile(row)
            getFileData(row)
              .catch(reject)
              .then(resolve)
          } else {
            resolve(row)
          }
        }
      })
    }))
  }
  return Promise.all(promises).then(rows => rows.filter(row => row !== null))
}

function cleanMissingFile (row) {
  // TODO: delete thumbnail files
  // TODO: queue files for delete instead of doing it right here
  db.removeFileById(row.id)
}

function ensureDirSync (dirpath) {
  try {
    fs.mkdirSync(dirpath, { recursive: true })
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

function getThumbPath (thumbName) {
  return path.resolve(
    config.get('thumbnail.dir'),
    thumbName.slice(0, 2),
    thumbName
  )
}

module.exports = {
  iterDir,
  getFileData,
  getFileDataBatch,
  searchDb
}
