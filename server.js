import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

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

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		unique: true,
		required: true,
	},
	password: {
		type: String,
		unique: true,
		minLength: 5,
	},
	accessToken: {
		type: String,
		default: () => crypto.randomBytes(128).toString('hex'),
		unique: true,
	},
	score: {
		type: Number,
		default: 0,
	},
});

userSchema.pre('save', async function (next) {
	const user = this;
	if (!user.isModified('password')) {
		return next();
	}
	const salt = bcrypt.genSaltSync();
	user.password = bcrypt.hashSync(user.password, salt);
	next();
});

const authenticateUser = async (req, res, next) => {
	try {
		const accessToken = req.header('Authorization');
		const user = await user.findOne({ accessToken });
		if (!user) {
			throw 'User not found';
		}
		req.user = user;
		next();
	} catch (err) {
		const errorMessage = 'Login failed, try again';
		res.status(401).json({ error: errorMessage });
	}
};

// Mongoose model for user
const User = mongoose.model('User', userSchema);

// Mongoose model  highscore
const Highscore = new mongoose.model('Highscore', {
	name: { type: String, unique: true },
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

// Sign up
app.post('/users', async (req, res) => {
	try {
		const { name, password } = req.body;
		const user = await new User({
			name,
			password,
		}).save();
		res.status(200).json({ userId: user._id, accessToken: user.accessToken });
	} catch (err) {
		res.status(400).json({ message: 'Could not create user', errors: err });
	}
});

// Login
app.post('/sessions', async (req, res) => {
	try {
		const { name, password } = req.body;
		const accessTokenUpdate = crypto.randomBytes(128).toString('hex');
		const user = await User.findOne({ name: name });
		if (user && bcrypt.compareSync(password, user.password)) {
			const updatedUser = await User.findOneAndUpdate(
				{ name: name },
				{ accessToken: accessTokenUpdate },
				{ new: true, useFindAndModify: false }
			);
			res.status(200).json({
				userId: updatedUser._id,
				accessToken: updatedUser.accessToken,
				score: updatedUser.score,
				userName: updatedUser.name,
			});
		} else {
			throw 'User not found';
		}
	} catch (err) {
		res.status(404).json({ error: 'User not found' });
	}
});

// Logout
app.post('/logout', async (req, res) => {
	try {
		const { userId } = req.body;
		const updatedUser = await User.findOneAndUpdate(
			{ _id: userId },
			{ accessToken: null },
			{ new: true, useFindAndModify: false }
		);
		res.status(200).json({
			userId: updatedUser._id,
			accessToken: updatedUser.accessToken,
		});
	} catch (err) {
		res.status(400).json({ error: err, message: 'Could not log out' });
	}
});

// Update Score
app.post('/userscore', async (req, res) => {
	try {
		const { userId, scoreNumber } = req.body;
		const updatedUser = await User.findOneAndUpdate(
			{ _id: userId },
			{ $inc: { score: scoreNumber } },
			{ new: true, useFindAndModify: false }
		);
		res.status(200).json({
			score: updatedUser.score,
		});
	} catch (err) {
		res.status(400).json({ error: err, message: 'Could not update score' });
	}
});

//get highscore
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

//post highscore or update existing highscore
app.post('/highscore', async (req, res) => {
	const { name, score } = req.body;
	const newHighscore = await new Highscore({ name, score });
	const highscoreList = await Highscore.findOne({ name: name });

	try {
		if (highscoreList) {
			const updateHighscore = await Highscore.findOneAndUpdate(
				{ name: name },
				{ score: score },
				{ new: true, useFindAndModify: false }
			);
			return res.status(201).json(updateHighscore);
		} else {
			const savedHighscore = await newHighscore.save();
			return res.status(201).json(savedHighscore);
		}
	} catch (err) {
		res.status(400).json({
			success: false,
			message: 'Could not post highscore',
			errors: err.errors,
		});
	}
});

//get questions and answers
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
