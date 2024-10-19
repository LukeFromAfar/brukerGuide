const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const guideSchema = new Schema({
  title: { type: String, required: true },
  tag: { type: String, required: true },
  sections: [
    {
      header: { type: String, required: false },
      description: { type: String, required: false },
      image: { type: String, required: false },
    },
  ],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Add this line
});

const Guides = mongoose.model("Guides", guideSchema);

module.exports = Guides;