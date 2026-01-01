const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getInactiveNotes
} = require('../controllers/note.controller');

router.use(protect);

router.route('/')
  .get(getNotes)
  .post(createNote);

router.get('/inactive', getInactiveNotes);

router.route('/:id')
  .get(getNote)
  .put(updateNote)
  .delete(deleteNote);

module.exports = router;