import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';

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

// Mongoose model for highscore
const Highscore = new mongoose.model('Highscore', {
	name: { type: String },
	score: { type: Number },
});

// Mongoose model for questions
const Questions = new mongoose.model('Questions', {
	id: { type: Number },
	question: {
		type: String,
		answers: [
			{
				id: { type: Number },
				answer: { type: String },
				isCorrect: { type: Boolean },
			},
		],
	},
});

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// List endpoints
app.get('/', (req, res) => {
	res.send(listEndpoints(app));
});

app.get('/highscore', (req, res) => {
	res.send('Here goes the highscore');
});

app.post('/highscore', (req, res) => {});

app.get('/questions', (req, res) => {});

// Start the server
app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
