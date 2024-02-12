const config = require('../../config/storage/table')
const { getTableClient } = require('../table')
const { odata } = require('@azure/data-tables')
const { addRadarVersion } = require('./radar-versions')

let client = getTableClient(config.radarTable)

const enrichEntry = (entry, partitionKey, rowKey) => ({
  partitionKey,
  rowKey,
  ...entry
})

const calculatePartitionKey = (year, month) => {
  const paddedYear = `${year}`.padStart(4, '0')
  const paddedMonth = `${month}`.padStart(2, '0')

  return `AI_UNIT_${paddedYear}_${paddedMonth}`
}

const entriesDto = (entries) => entries.map(entry => ({
  name: entry.name,
  quadrant: entry.quadrant,
  ring: entry.ring,
  description: entry.description,
  url: entry.url
}))

const queryEntriesByPartition = (partition, additionalOptions) => {
  const results = client.listEntities({
    queryOptions: {
      filter: odata`PartitionKey eq ${partition}`,
      ...additionalOptions
    }
  })

  return results
}

const deleteEntriesByPartition = async (partition) => {
  const iter = queryEntriesByPartition(partition)

  for await (const entity of iter) {
    await client.deleteEntity(entity.partitionKey, entity.rowKey)
  }
}

const getLatestRadar = async () => {
  const iter = queryEntriesByPartition('AI_UNIT')

  const entries = []

  for await (const entity of iter) {
    entries.push(entity)
  }

  return entriesDto(entries)
}

const getRadarRelease = async (year, month) => {
  const iter = queryEntriesByPartition(calculatePartitionKey(year, month))

  const entries = []

  for await (const entity of iter) {
    entries.push(entity)
  }

  return entriesDto(entries)
}

const addRadarEntry = async (entry) => {
  const entity = enrichEntry(entry, 'AI_UNIT', entry.name)

  const exists = await client.getEntity(entity.partitionKey, entity.rowKey)

  if (exists) {
    throw new Error(`Entry ${entity.partitionKey}/${entity.rowKey} already exists`)
  }

  return client.createEntity(entity)
}

const createRadarRelease = async () => {
  const now = new Date()

  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const partitionKey = calculatePartitionKey(year, month)

  await deleteEntriesByPartition(partitionKey)

  const iter = queryEntriesByPartition('AI_UNIT')

  for await (const entity of iter) {
    const entry = enrichEntry(entity, partitionKey, entity.rowKey)
    await client.createEntity(entry)
  }

  await addRadarVersion(year, month)
}

module.exports = {
  getLatestRadar,
  getRadarRelease,
  addRadarEntry,
  createRadarRelease
}
