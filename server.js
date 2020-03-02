require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	GoogleStrategy = require('passport-google-oauth20').Strategy,
	FacebookStrategy = require('passport-facebook').Strategy,
	VKontakteStrategy = require('passport-vkontakte').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');

const bodyParser = require('body-parser');
const _ = require('lodash');
var randomWords = require('random-words');

const app = express();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(session({
	secret: process.env.SECRET,
	resave: false,
	store: new MongoStore({
		mongooseConnection: mongoose.connection,
		touchAfter: 24 * 3600
	}),
	cookie: { maxAge: Date.now() + (30 * 24 * 60 * 60 * 1000) },
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(process.env.DB, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
mongoose.connection.once('open', function() {
	console.log('Conection has been made!');
}).on('error', function(error) {
	console.log('Error is: ', error);
});

const socialSchema = ({
	provider: String,
	id: String,
	login: String,
	gender: String,
	birthday: String,
	city: String,
	url: String
});
const Social = mongoose.model('Social', socialSchema);

const gamerSchema = ({
	name: String,
	account: String,
	record: Number,
	groupe: String,
	play: String
});
const settingsSchema = new mongoose.Schema({
	username: { type: String, unique: true },
	firstName: String,
	lastName: String,
	timer: Number,
	extraWords: Array,
	deleteWords: Array,
	pass: String,
	categories: Array,
	social: [socialSchema],
	webPass: String,
	password: String
});
const wordsSchema = ({
	name: String,
	category: String,
	words: Array

});

settingsSchema.plugin(passportLocalMongoose);

const Player = mongoose.model('Player', gamerSchema);
const Setting = new mongoose.model('Setting', settingsSchema);
const Word = mongoose.model('Word', wordsSchema);

passport.use(Setting.createStrategy()); // - passportLocalMongoose
passport.serializeUser(Setting.serializeUser());
passport.deserializeUser(Setting.deserializeUser());


passport.use(new GoogleStrategy({
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: process.env.URL + '/auth/google/callback',
		userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
	},
	function(accessToken, refreshToken, profile, cb) {
		console.log(profile);
		Setting.findOne({ username: profile._json.email }, function(err, found) {
			if(err) console.log(err);
			if(!found) {
				Setting.register({
					username: profile._json.email,
					firstName: profile.name.givenName,
					lastName: profile.name.familyName,
					timer: 60,
					pass: '',
					categories: 'classic',
					social: {
						provider: 'google',
						id: profile.id,
						login: profile.username,
						gender: profile.gender,
						url: profile.profileUrl
					},
					webPass: profile.id
				}, String(profile.id), function(err, user) {
					if(err) console.log(err);
					return cb(err, user);

				});
			} else {
				Setting.findOne({ username: profile._json.email, 'social.provider': 'google' }, function(err, socialFound) {
					if(err) console.log(err);
					if(!socialFound) {
						const social = new Social({
							provider: 'google',
							id: profile.id,
							login: profile.username,
							gender: profile.gender,
							url: profile.profileUrl
						});
						found.social.push(social);
						found.save();
						return cb(err, found);
					} else {
						return cb(err, socialFound);
					}
				});

			}
		});
	}));

passport.use(new FacebookStrategy({
		clientID: process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_APP_SECRET,
		callbackURL: process.env.URL + '/auth/facebook/callback',
		profileFields: ['email', 'id', 'first_name', 'gender', 'last_name']
	},
	function(err, accessToken, refreshToken, profile, cb) {
		console.log(profile);
		Setting.findOne({ username: profile.emails[0].value }, function(err, found) {
			if(err) console.log(err);
			if(!found) {
				Setting.register({
					username: profile.emails[0].value,
					firstName: profile._json.first_name,
					timer: 60,
					categories: 'classic',
					lastName: profile._json.last_name,
					social: {
						provider: profile.provider,
						id: profile.id
					},
					webPass: profile.id
				}, String(profile.id), function(err, user) {
					if(err) console.log(err);
					return cb(err, user);

				});
			} else {
				Setting.findOne({ username: profile.emails[0].value, 'social.provider': 'facebook', 'social.id': profile.id }, (err, socialFound) => {
					if(err) console.log(err);
					if(!socialFound) {
						const social = new Social({
							provider: profile.provider,
							id: profile.id
						});
						found.social.push(social);
						found.save();
						return cb(err, socialFound);
					} else {
						return cb(err, socialFound);
					}
				});

			}
		});
		console.log('Error status: ', err.status)
	}
));

passport.use(new VKontakteStrategy({
		clientID: process.env.VKONTAKTE_APP_ID,
		clientSecret: process.env.VKONTAKTE_APP_SECRET,
		callbackURL: process.env.URL + '/auth/vkontakte/callback',
		profileFields: ['email', 'city', 'bdate']
	},
	function(accessToken, refreshToken, params, profile, done) {
		console.log(profile);
		Setting.findOne({ username: params.email }, function(err, found) {
			if(err) console.log(err);
			if(!found) {
				Setting.register({
					username: params.email,
					firstName: profile.name.givenName,
					lastName: profile.name.familyName,
					timer: 60,
					pass: '',
					categories: 'classic',
					social: {
						provider: profile.provider,
						id: profile.id,
						login: profile.username,
						gender: profile.gender,
						birthday: profile.birthday,
						city: profile.city,
						url: profile.profileUrl
					},
					webPass: profile.id
				}, String(profile.id), function(err, user) {
					if(err) console.log(err);
					return done(err, user);

				});
			} else {
				Setting.findOne({ username: params.email, 'social.provider': 'vkontakte' }, function(err, kontakt) {
					if(err) {
						console.log(err);
						return done(err);
					}
					if(!kontakt) {
						const social = new Social({
							provider: profile.provider,
							id: profile.id,
							login: profile.username,
							gender: profile.gender,
							birthday: profile.birthday,
							city: profile.city,
							url: profile.profileUrl
						});
						found.social.push(social);
						found.save();
						if(err) console.log(err);
						return done(err, found);
					} else {
						return done(err, kontakt);
					}
				});

			}
		});
	}
));

const admin = process.env.ADMIN;

app.get('/auth/google',
	passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get('/auth/facebook',
	passport.authenticate('facebook')
);
app.get('/auth/vkontakte',
	passport.authenticate('vkontakte', { scope: ['email', 'notify'] })
);
app.get('/auth/google/callback',
	passport.authenticate('google', {
		successRedirect: '/',
		failureRedirect: '/'
	})
);
app.get('/auth/facebook/callback',
	passport.authenticate('facebook', {
		successRedirect: '/',
		failureRedirect: '/'
	})
);
app.get('/auth/vkontakte/callback',
	passport.authenticate('vkontakte', {
		successRedirect: '/',
		failureRedirect: '/'
	})
);

app.get('/', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		Setting.findOne({ username: account }, function(err, foundOne) {
			if(!foundOne) {
				res.redirect('/');
			} else {
				res.render('start', {
					account: account,
					name: foundOne.firstName
				});
			}
		});
	} else {
		if(req.query.error) {
			res.render('new', {
				error: 'Вы ввели неправильный пароль.',
				register: '',
				action: 'login'
			});
		} else {
			res.render('new', {
				error: '',
				register: '',
				action: 'login'
			});

		}
	}
});

app.route('/register')

	.get(function(req, res) {
		if(req.isAuthenticated()) {
			res.redirect('/');
		} else {
			res.render('new', {
				error: '',
				register: 'yes',
				action: 'register'
			});
		}
	})

	.post(function(req, res) {
		const account = req.body.username;
		const firstName = req.body.firstname;
		const lastName = req.body.lastname;
		Setting.findOne({ username: account }, function(err, foundOne) {
			if(!foundOne) {
				Setting.register({
					username: account,
					firstName: firstName,
					lastName: lastName,
					timer: 60,
					pass: '',
					categories: 'classic',
					webPass: '',
				}, req.body.password, function(err) {
					if(err) console.log(err);
					passport.authenticate('local', {
						successRedirect: '/',
						failureRedirect: '/register'
					})(req, res, function() {});

				});
			} else {
				const setting = new Setting({
					username: account,
					password: req.body.password
				});
				req.login(setting, function(err) {
					if(err) console.log(err);
					passport.authenticate('local', {
						successRedirect: '/',
						failureRedirect: '/register'
					})(req, res, function() {});

				});
			}
		});
	})

app.route('/login')

	.get(function(req, res) {
		passport.authenticate('local', {
			successRedirect: '/',
			failureRedirect: '/'
		})(req, res, function() {});
	})

	.post(function(req, res) {
		const account = req.body.username;
		Setting.findOne({ username: account }, function(err, foundOne) {
			if(err) console.log(err);
			if(!foundOne) {
				res.redirect('/register');
			} else {
				const setting = new Setting({
					username: account,
					password: req.body.password
				});
				passport.authenticate('local', {
					successRedirect: '/',
					failureRedirect: '/?error=yes'
				})(req, res, function() {});
			}
		});
	})

app.get('/logout', function(req, res) {
	req.logout('/');
	res.redirect('/');
});


app.route('/settings')

	.get(function(req, res) {
		if(req.isAuthenticated()) {
			const account = req.user.username;
			Setting.findOne({ username: account }, function(err, foundSetting) {
				if(err) console.log(err);
				if(!foundSetting) {
					res.redirect('/');
				} else {
					Word.find(function(err, foundWord) {
						const allCategories = foundWord.map(word => word.category);
						const userCategories = foundSetting.categories;
						const activeCategories = _.intersection(allCategories, userCategories);
						const sleepCategories = allCategories.filter((f) => !activeCategories.includes(f));
						const extraWords = foundSetting.extraWords;
						var extraList = '';
						if(userCategories) {
							extraList = userCategories.some(f => ("extraWords").indexOf(f) >= 0);
						}
						// console.log(extraWords)
						Word.find({ category: activeCategories }, function(err, activeCategory) {
							Word.find({ category: sleepCategories }, function(err, sleepCategory) {
								res.render('settings', {
									timer: foundSetting.timer,
									checked: foundSetting.pass,
									activeWords: activeCategory,
									sleepWords: sleepCategory,
									extraList: extraList,
									extraWords: extraWords,
									account: account
								});
							});
						});

					});
				}
			});
		} else {
			res.redirect('/');
		}
	})
	.post(function(req, res) {
		if(req.isAuthenticated()) {
			const account = req.user.username;
			const allWords = _.toLower(req.body.newWord).split(',');
			const wordList = req.body.wordList;
			const words = allWords.map(s => s.trim());
			const categories = req.body.categories;

			Setting.find({ username: account }, function(err) {
				if(err) console.log(err);
				Setting.updateMany({
						username: account,
					}, {
						$set: {
							categories: categories,
						}
					},
					function() {});
			});
			Setting.updateOne({ username: account }, { $pull: { extraWords: { $in: wordList } } }, function() {});
			if(req.body.newWord != '') {
				if(account == admin) {
					Word.updateOne({ category: 'country' }, {
						$addToSet: { words: words }
					}, function(err) {});
				} else {
					Setting.updateOne({ username: account }, {
						$addToSet: { extraWords: words }
					}, function() {});
				}
			}
			const timer = req.body.timer;
			const pass = req.body.pass;
			Setting.findOneAndUpdate({ username: account }, {
					$set: {
						timer: timer,
						pass: pass
					}
				},
				function(err) {
					if(err) console.log(err);
					res.redirect('/settings');
				});
		} else {
			res.redirect('/');
		}
	})

app.route('/players')

	.get(function(req, res) {
		if(req.isAuthenticated()) {
			const account = req.user.username;
			Setting.findOne({ username: account }, function(err, foundSetting) {
				if(!foundSetting) {
					res.redirect('/');
				} else {
					Player.find({ account: account, play: 'no', groupe: '' }, function(err, activePlayers) {
						if(!err) {
							Player.find({ account: account, groupe: { $ne: '' } }, function(err, ghostPlayers) {
								if(!err) {
									res.render('players', {
										activePlayers: activePlayers,
										ghostPlayers: ghostPlayers,
										account: account
									});
								}
							});
						}
					});
				}
			});
		} else {
			res.redirect('/');
		}
	})

	.post(function(req, res) {
		if(req.isAuthenticated()) {
			const account = req.user.username;
			const newPlayer = _.capitalize(req.body.newPlayer);
			Player.findOne({ account: account, name: newPlayer }, function(err, foundplayer) {
				if(err) console.log(err);
				if(!foundplayer) {
					const player = new Player({
						name: newPlayer,
						record: 0,
						account: account,
						groupe: '',
						play: 'no'
					});
					player.save();
				};
				res.redirect('/players');
			});
		} else {
			res.redirect('/');
		}
	});

app.post('/deletePlayer', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		const deletePlayer = _.capitalize(req.body.deletePlayer);
		Player.deleteOne({ account: account, name: deletePlayer }, function(deletePlayer) {
			res.redirect('/players');
		});
	} else {
		res.redirect('/');
	}
});

app.post('/updatePlayer', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		const updatePlayer = req.body.checkbox;
		const randomInt = randomWords();
		Player.updateMany({
				account: account,
				name: { $in: updatePlayer }
			}, {
				$set: { groupe: randomInt, play: "yes" }
			},
			function(err, updatePlayer) {

				res.redirect('/play?groupe=' + randomInt);
			});
	} else {
		res.redirect('/');
	}
});

app.get('/play', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		const groupe = (req.query.groupe).trim();

		//находим игроков в группе
		Player.find({ account: account, groupe: groupe, play: 'yes' }, function(err, players) {
			if(err) console.log(err);

			//находим настроки пользователя
			Setting.findOne({ username: account }, function(err, foundSetting) {
				//время игры
				const timer = req.headers.host === 'localhost:3000' ? '15' : foundSetting.timer;
				//штраф за пропуск слова
				const pass = foundSetting.pass == 'checked' && 'checked';
				//активные категории слов
				const userCategories = foundSetting.categories;
				// console.log(userCategories.length);

				//находим наши категории слов
				Word.find({ category: userCategories }, function(err, foundWords) {
					if(userCategories) {
						//собираем здесь все слова
						var words = _.flatten(foundWords.map(word => word.words));

						//проверяем активна ли категория пользовательских слов
						const extraWords = userCategories.some(f => ('extraWords').indexOf(f) >= 0);
						extraWords && words.push(foundSetting.extraWords);

						//убираем удаленные слова
						words = words.filter((r) => !foundSetting.deleteWords.includes(r));

						//осталось больше 1 игрока
						if(players.length > 1) {
							res.render('play', {
								timer: timer,
								pass: pass,
								words: words,
								thisPlayer: players[0].name,
								nextPlayer: players[1].name,
								groupe: groupe,
								account: account
							});
							//все сыграли
						} else if(!players.length) {
							Player.find({ account: account, groupe: groupe },
								function(err, results) {
									if(!results.length) {
										res.redirect('/' + account);
									} else {
										res.render('gameOver', {
											results: results,
											account: account
										});
									};
								}).sort({ record: -1 });
							//последний игрок
						} else {
							res.render('play', {
								timer: timer,
								pass: pass,
								words: words,
								thisPlayer: players[0].name,
								nextPlayer: '',
								groupe: groupe,
								account: account
							});
						};
					} else {
						res.redirect('/settings');
					};
				});
			});
		});
	} else {
		res.redirect('/');
	}
});

app.post('/gameOver', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		const updatePlayer = req.body.checkbox;
		Player.updateMany({
				account: account,
				name: { $in: updatePlayer }
			}, {
				$set: { groupe: '', play: 'no', record: 0 }
			},
			function(err, updatePlayer) {
				res.redirect('/');
			});
	} else {
		res.redirect('/');
	}
});

app.get('/exit', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		const groupe = req.query.groupe.trim();
		Player.updateMany({
				account: account,
				groupe: groupe,
			}, {
				$set: { groupe: '', play: 'no', record: 0 }
			},
			function(err, updatePlayer) {
				res.redirect('/');
			});
	} else {
		res.redirect('/');
	}
});

app.post('/nextPlayer', function(req, res) {
	if(req.isAuthenticated()) {
		const account = req.user.username;
		const thisPlayer = req.body.thisPlayer;
		const nextPlayer = req.body.nextPlayer;
		const thisRecord = req.body.thisRecord;
		const groupe = req.body.groupe;

		Setting.find({ username: account }, function(err, mywords) {

			//добавляем удаленные пользователем из игры слова
			const deleteWord = (_.lowerCase(req.body.deleteWord)).split(' ');
			if(deleteWord.length > 0) {
				Setting.updateOne({ username: account }, {
					$addToSet: { deleteWords: deleteWord }
				}, function(err, findOne) {});
			}
		});

		Player.findOneAndUpdate({ account: account, name: thisPlayer }, { $set: { play: 'no', record: thisRecord } }, function(err, updatePlayer) {
			if(err) console.log(err);
			res.redirect('/play?groupe=' + groupe);

		});
	} else {
		res.redirect('/');
	}
});
app.get('*', function(req, res) {
	res.redirect('/');
});



app.listen(process.env.PORT || 3000, function() {
	console.log('Server is ready on :3000')
});