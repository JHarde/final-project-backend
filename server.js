import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';

import questions from './questions.json';

// list endpoints in the '/' route
const listEndpoints = require('express-list-endpoints');

// Defines the port the app will run on. Defaults to 8080, but can be
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Mongooose connection
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/8080';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// Mongoose model for highscore
const Highscore = new mongoose.model('Highscore', {
	name: { type: String },
	score: { type: Number },
});

// Mongoose model for questions
const Question = new mongoose.model('Question', {
	description: { type: String },
	question: { type: String },
	answers: { type: Array },
	correctAnswer: { type: Array },
	why: { type: String },
});

if (process.env.RESET_DATABASE) {
	const populateDatabase = async () => {
		await Question.deleteMany();
		questions.forEach((item) => {
			const newQuestion = new Question(item);
			newQuestion.save();
		});
	};
	populateDatabase();
}

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// List endpoints
app.get('/', (req, res) => {
	res.send(listEndpoints(app));
});

app.get('/highscore', async (req, res) => {
	try {
		const highscore = await Highscore.find()
			.sort({ score: 'desc' })
			.limit(10)
			.exec();
		res.json(highscore);
	} catch (err) {
		res.status(400).json({
			success: false,
			message: 'Could not get highscores',
			errors: err.errors,
		});
	}
});

app.post('/highscore', async (req, res) => {
	const { name, score } = req.body;
	const newHighscore = await new Highscore({ name, score });
	try {
		const savedHighscore = await newHighscore.save();
		res.status(201).json(savedHighscore);
	} catch (err) {
		res.status(400).json({
			success: false,
			message: 'Could not post highscore',
			errors: err.errors,
		});
	}
});

app.get('/questions', async (req, res) => {
	try {
		const allQuestions = await Question.find();
		res.json(allQuestions);
	} catch (err) {
		res.status(400).json({
			success: false,
			message: 'Could not get questions',
			errors: err.errors,
		});
	}
});

// Start the server
app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
