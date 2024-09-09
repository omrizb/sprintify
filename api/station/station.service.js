import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const stationService = {
	remove,
	query,
	getById,
	add,
	update,

}

async function query(filterBy = { txt: '' }) {
	try {

		// if (edit) {
		// 	const collection = await dbService.getCollection('station')
		// 	var stationCursor = await collection.find({}).toArray()

		// 	stationCursor.forEach(station => {
		// 		if (station.createdBy.id === 'AAAA') station.createdBy.id = '66de2eb16260c20fa8d47f9f'
		// 		station.likedByUsers = station.likedByUsers.map(likedId => {
		// 			if (likedId === 'AAAA') likedId = '66de2eb16260c20fa8d47f9f'
		// 			return likedId
		// 		})
		// 	})
		// 	for (let i = 0; i < stationCursor.length; i++) {
		// 		stationCursor[i]._id = stationCursor[i]._id.toString()

		// 		await update(stationCursor[i])

		// 	}
		// 	return stationCursor
		// }
		const criteria = _buildCriteria(filterBy)
		const sort = _buildSort(filterBy)

		const collection = await dbService.getCollection('station')
		var stationCursor = await collection.find(criteria, { sort })

		if (filterBy.pageIdx !== undefined) {
			stationCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
		}

		const stations = stationCursor.toArray()
		return stations
	} catch (err) {
		logger.error('cannot find stations', err)
		throw err
	}
}

async function getById(stationId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(stationId) }

		const collection = await dbService.getCollection('station')
		const station = await collection.findOne(criteria)

		station.createdAt = station._id.getTimestamp()
		return station
	} catch (err) {
		logger.error(`while finding station ${stationId}`, err)
		throw err
	}
}

async function remove(stationId) {
	const { loggedinUser } = asyncLocalStorage.getStore()
	const { _id: ownerId, isAdmin } = loggedinUser

	try {
		const criteria = {
			_id: ObjectId.createFromHexString(stationId),
		}

		if (!isAdmin) criteria['createdBy.id'] = ownerId

		const collection = await dbService.getCollection('station')
		const res = await collection.deleteOne(criteria)

		if (res.deletedCount === 0) throw ('Not your station')
		return stationId
	} catch (err) {
		logger.error(`cannot remove station ${stationId}`, err)
		throw err
	}
}

async function add(station) {
	try {
		const collection = await dbService.getCollection('station')
		await collection.insertOne(station)
		return station
	} catch (err) {
		logger.error('cannot insert station', err)
		throw err
	}
}

async function update(station) {
	const stationToSave = {
		name: station.name,
		type: station.type,
		isLikedSongs: station.isLikedSongs,
		tags: station.tags,
		stationImgUrl: station.stationImgUrl,
		description: station.description,
		isOwnedByUser: station.isOwnedByUser,
		createdBy: station.createdBy,
		likedByUsers: station.likedByUsers,
		songs: station.songs,
		createdAt: station.createdAt,
		addedAt: station.addedAt,
		isPinned: station.isPinned,
		lastIdx: station.lastIdx || ''
	}

	try {
		const criteria = { _id: ObjectId.createFromHexString(station._id) }

		const collection = await dbService.getCollection('station')
		await collection.updateOne(criteria, { $set: stationToSave })
		return station
	} catch (err) {
		logger.error(`cannot update station ${station._id}`, err)
		throw err
	}
}


function _buildCriteria(filterBy) {
	const criteria = {
		name: { $regex: filterBy.txt, $options: 'i' },
	}

	if (filterBy.createdBy) {
		criteria['createdBy.id'] = filterBy.createdBy
	}

	if (filterBy.stationType) {
		criteria.type = filterBy.stationType
	}

	if (filterBy.spotifyId) {
		criteria['createdBy.id'] = filterBy.spotifyId
	}

	if (filterBy.userId) {

		criteria.$or = [
			{ "createdBy.id": filterBy.userId }, // Condition to match createdBy.id
			{ likedByUsers: filterBy.userId } // Condition to check if userId is in the likedByUsers array
		]
	}


	return criteria
}

function _buildSort(filterBy) {
	if (!filterBy.sortField) return {}
	return { [filterBy.sortField]: filterBy.sortDir }
}