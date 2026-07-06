const mongoose = require('mongoose')

const collectionSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
    default: null
  }
}, { timestamps: true })

module.exports = mongoose.model('Collection', collectionSchema)
